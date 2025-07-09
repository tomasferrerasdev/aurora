"use client";
import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useControls } from "leva";

const fragmentShader = /* glsl */ `
  uniform float uProgress;
  uniform float uGlintIntensity;
  uniform float uGlintProgress;
  uniform vec2 uResolution;
  uniform sampler2D uTexture;
  uniform float uTime;
  varying vec2 vUv;
  
  void main() {
    vec2 uv = vUv;
    float f = 1.0 - uProgress;
    
    float t = uv.y;
    float bias = sin(t * 3.14159) * 0.1;
    bias = pow(bias, 0.9);
    
    float BOTTOM_POS = 0.5;
    float BOTTOM_THICKNESS = 0.1;
    float MINI_FRAME_THICKNESS = 0.1;
    vec2 MINI_FRAME_POS = vec2(0.5 - MINI_FRAME_THICKNESS * 0.5, 0.1);
    
    float min_x_curve = mix((BOTTOM_POS - BOTTOM_THICKNESS / 2.0) + bias, 0.0, t);
    float max_x_curve = mix((BOTTOM_POS + BOTTOM_THICKNESS / 2.0) - bias, 1.0, t);
    float min_x = mix(min_x_curve, MINI_FRAME_POS.x, f);
    float max_x = mix(max_x_curve, MINI_FRAME_POS.x + MINI_FRAME_THICKNESS, f);
    float min_y = mix(0.0, MINI_FRAME_POS.y, f);
    float max_y = mix(1.0, MINI_FRAME_POS.y + MINI_FRAME_THICKNESS, f);
    
    vec2 modUV = (uv - vec2(min_x, min_y)) / (vec2(max_x, max_y) - vec2(min_x, min_y));
    vec2 finalUV = mix(uv, modUV, 1.0 * f);
    
    // aspect ratio correction
    float aspect = uResolution.x / uResolution.y;
    vec2 textureUV = finalUV;
    if (aspect > 1.0) {
      // landscape
      textureUV.x = (finalUV.x - 0.5) / aspect + 0.5;
    } else {
      // portrait
      textureUV.y = (finalUV.y - 0.5) * aspect + 0.5;
    }
    
    // texture
    // vec3 tex = texture2D(uTexture, textureUV).rgb;
    
    // uv coordinates
    vec3 tex = vec3(textureUV.x, textureUV.y, 0.0);
    
    // clip outside the bounds
    tex = finalUV.x > 1.0 || finalUV.x < 0.0 ? vec3(0.0) : tex;
    tex = finalUV.y > 1.0 || finalUV.y < 0.0 ? vec3(0.0) : tex;
    
    // glint effect
    float linewidth = 0.58;
    float grad = 3.0;
    vec3 col1 = vec3(0.3, 0.0, 0.0); 
    vec3 col2 = vec3(0.85, 0.85, 0.85);
    
    // glint progress
    vec2 linepos = uv;
    linepos.x = linepos.x - (uGlintProgress * 2.0 - 0.5);
    
    float y = linepos.x * grad;
    float s = smoothstep(y - linewidth, y, linepos.y) - smoothstep(y, y + linewidth, linepos.y);
    
    // glint intensity
    vec3 glint = s * col1 + s * col2;
    tex = tex + glint * uGlintIntensity;
    
    // black bg
    vec3 finalColor = finalUV.x > 1.0 || finalUV.x < 0.0 || finalUV.y > 1.0 || finalUV.y < 0.0 ? vec3(0.0) : tex;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export default function Genie() {
  return (
    <main className="w-full h-screen ">
      <Canvas>
        <color attach="background" args={["#000"]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <OrthographicCamera makeDefault position={[0, 0, 8]} />
        <OrbitControls />
        <Scene />
      </Canvas>
    </main>
  );
}

const Scene = () => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { camera, size } = useThree();

  const { progress, glintIntensity, glintProgress } = useControls({
    progress: {
      value: 0,
      min: 0,
      max: 1,
      step: 0.01,
      label: "Animation Progress",
    },
    glintIntensity: {
      value: 0,
      min: 0,
      max: 1,
      step: 0.01,
      label: "Glint Intensity",
    },
    glintProgress: {
      value: 0,
      min: 0,
      max: 1,
      step: 0.01,
      label: "Glint Progress",
    },
  });

  const texture = useMemo(() => {
    const tex = new THREE.TextureLoader().load("/terminal.png");
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uProgress.value = progress;
      materialRef.current.uniforms.uGlintIntensity.value = glintIntensity;
      materialRef.current.uniforms.uGlintProgress.value = glintProgress;
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  const shaderMaterial = useMemo(
    () => (
      <shaderMaterial
        ref={materialRef}
        fragmentShader={fragmentShader}
        vertexShader={vertexShader}
        uniforms={{
          uProgress: { value: 0.0 },
          uGlintIntensity: { value: 0.0 },
          uGlintProgress: { value: 0.0 },
          uResolution: { value: new THREE.Vector2(size.width, size.height) },
          uTexture: { value: texture },
          uTime: { value: 0.0 },
        }}
      />
    ),
    [size, texture]
  );

  const planeSize = useMemo(() => {
    if (camera.type === "OrthographicCamera") {
      const orthoCamera = camera as THREE.OrthographicCamera;

      const left = orthoCamera.left;
      const right = orthoCamera.right;
      const top = orthoCamera.top;
      const bottom = orthoCamera.bottom;

      const width = Math.abs(right - left) / orthoCamera.zoom;
      const height = Math.abs(top - bottom) / orthoCamera.zoom;

      return [width, height] as [number, number];
    }
    return [2, 2] as [number, number];
  }, [camera, size]);

  return (
    <>
      <mesh position={[0, 0, 0]} scale={1}>
        <planeGeometry args={planeSize} />
        {shaderMaterial}
      </mesh>
    </>
  );
};
