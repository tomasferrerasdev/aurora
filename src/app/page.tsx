"use client";
import {
  Grid,
  OrbitControls,
  PerspectiveCamera,
  useGLTF,
} from "@react-three/drei";
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useControls } from "leva";

interface AuroraConfig {
  noiseScale: number;
  noiseStretch: number;
  noiseSpeed: number;
  verticalGradientStrength: number;
  radialGradientStrength: number;
  greenIntensity: number;
  blueIntensity: number;
  purpleIntensity: number;
  colorMixSpeed1: number;
  colorMixSpeed2: number;
  colorMixFrequency1: number;
  colorMixFrequency2: number;
  auroraThreshold: number;
  auroraBlur: number;
  overallIntensity: number;
}

export default function Home() {
  const auroraConfig = useControls("Aurora Controls", {
    // Noise controls
    noiseScale: { value: 3.0, min: 0.1, max: 10.0, step: 0.1 },
    noiseStretch: { value: 0.05, min: 0.01, max: 0.5, step: 0.01 },
    noiseSpeed: { value: 0.5, min: 0.1, max: 2.0, step: 0.1 },

    // Gradient controls
    verticalGradientStrength: { value: 1.0, min: 0.0, max: 2.0, step: 0.1 },
    radialGradientStrength: { value: 1.0, min: 0.0, max: 2.0, step: 0.1 },

    // Color controls
    greenIntensity: { value: 0.8, min: 0.0, max: 1.0, step: 0.1 },
    blueIntensity: { value: 1.0, min: 0.0, max: 1.0, step: 0.1 },
    purpleIntensity: { value: 1.0, min: 0.0, max: 1.0, step: 0.1 },

    // Animation controls
    colorMixSpeed1: { value: 0.3, min: 0.1, max: 1.0, step: 0.1 },
    colorMixSpeed2: { value: 0.5, min: 0.1, max: 1.0, step: 0.1 },
    colorMixFrequency1: { value: 3.0, min: 1.0, max: 10.0, step: 0.5 },
    colorMixFrequency2: { value: 2.0, min: 1.0, max: 10.0, step: 0.5 },

    // Intensity controls
    auroraThreshold: { value: 0.6, min: 0.0, max: 1.0, step: 0.1 },
    auroraBlur: { value: 0.3, min: 0.0, max: 0.5, step: 0.05 },
    overallIntensity: { value: 1.0, min: 0.0, max: 2.0, step: 0.1 },
  });

  return (
    <main className="w-full h-screen ">
      <Canvas>
        <color attach="background" args={["#171717"]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Grid args={[10, 10]} />

        <PerspectiveCamera makeDefault position={[0, 0, 8]} />
        <OrbitControls />
        <Scene config={auroraConfig} />
      </Canvas>
    </main>
  );
}

const Scene = ({ config }: { config: AuroraConfig }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Animate the shader material
  useFrame((state) => {
    if (meshRef.current && meshRef.current.material) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime;
      material.uniforms.uScale.value = config.noiseScale;
      material.uniforms.uNoiseStretch.value = config.noiseStretch;
      material.uniforms.uNoiseSpeed.value = config.noiseSpeed;
      material.uniforms.uVerticalGradientStrength.value =
        config.verticalGradientStrength;
      material.uniforms.uRadialGradientStrength.value =
        config.radialGradientStrength;
      material.uniforms.uGreenIntensity.value = config.greenIntensity;
      material.uniforms.uBlueIntensity.value = config.blueIntensity;
      material.uniforms.uPurpleIntensity.value = config.purpleIntensity;
      material.uniforms.uColorMixSpeed1.value = config.colorMixSpeed1;
      material.uniforms.uColorMixSpeed2.value = config.colorMixSpeed2;
      material.uniforms.uColorMixFrequency1.value = config.colorMixFrequency1;
      material.uniforms.uColorMixFrequency2.value = config.colorMixFrequency2;
      material.uniforms.uAuroraThreshold.value = config.auroraThreshold;
      material.uniforms.uAuroraBlur.value = config.auroraBlur;
      material.uniforms.uOverallIntensity.value = config.overallIntensity;
    }
  });

  return (
    <>
      <Aurora config={config} />
      <mesh ref={meshRef} position={[0, 0, 3]}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          transparent={true}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={true}
          side={THREE.DoubleSide}
          fragmentShader={`
            uniform float uTime;
            uniform float uScale;
            uniform float uNoiseStretch;
            uniform float uNoiseSpeed;
            uniform float uVerticalGradientStrength;
            uniform float uRadialGradientStrength;
            uniform float uGreenIntensity;
            uniform float uBlueIntensity;
            uniform float uPurpleIntensity;
            uniform float uColorMixSpeed1;
            uniform float uColorMixSpeed2;
            uniform float uColorMixFrequency1;
            uniform float uColorMixFrequency2;
            uniform float uAuroraThreshold;
            uniform float uAuroraBlur;
            uniform float uOverallIntensity;
            varying vec2 vUv;
            
            // Perlin noise functions
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
            
            float snoise(vec2 v) {
              const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                                 -0.577350269189626, 0.024390243902439);
              vec2 i  = floor(v + dot(v, C.yy) );
              vec2 x0 = v -   i + dot(i, C.xx);
              vec2 i1;
              i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
              vec4 x12 = x0.xyxy + C.xxzz;
              x12.xy -= i1;
              i = mod289(i);
              vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                              + i.x + vec3(0.0, i1.x, 1.0 ));
              vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                                    dot(x12.zw,x12.zw)), 0.0);
              m = m*m ;
              m = m*m ;
              vec3 x = 2.0 * fract(p * C.www) - 1.0;
              vec3 h = abs(x) - 0.5;
              vec3 ox = floor(x + 0.5);
              vec3 a0 = x - ox;
              m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
              vec3 g;
              g.x  = a0.x  * x0.x  + h.x  * x0.y;
              g.yz = a0.yz * x12.xz + h.yz * x12.yw;
              return 130.0 * dot(m, g);
            }
            
            void main() {
              vec2 uv = vUv;
              
              // Create animated Perlin noise with scale and time, stretched along Y-axis
              float noise = snoise(vec2(uv.x * uScale + uTime * uNoiseSpeed, uv.y * uScale * uNoiseStretch));
              noise = (noise + 1.0) * 0.5; // Normalize to 0-1
              
              // Create aurora effect with vertical and radial gradients
              // Vertical gradient (top to bottom)
              float verticalGradient = pow(1.0 - uv.y, uVerticalGradientStrength);
              
              // Radial gradient from center
              vec2 center = vec2(0.5, 0.5);
              float distance = length(uv - center);
              float radialGradient = pow(1.0 - distance, uRadialGradientStrength);
              
              // Edge gradient to make mesh boundaries transparent
              float edgeGradient = 1.0;
              // Fade out at UV edges
              edgeGradient *= smoothstep(0.0, 0.1, uv.x) * smoothstep(0.0, 0.1, 1.0 - uv.x);
              edgeGradient *= smoothstep(0.0, 0.1, uv.y) * smoothstep(0.0, 0.1, 1.0 - uv.y);
              // Additional fade at corners
              float cornerDistance = length(uv - vec2(0.5, 0.5));
              edgeGradient *= smoothstep(0.7, 0.5, cornerDistance);
              
              // Mix gradients with noise
              float auroraIntensity = smoothstep(uAuroraThreshold - uAuroraBlur, uAuroraThreshold + uAuroraBlur, noise);
              auroraIntensity *= verticalGradient * radialGradient * edgeGradient;
              
              // Aurora color palette (greens, blues, purples)
              vec3 auroraColor1 = vec3(0.0, uGreenIntensity, 0.4); // Green
              vec3 auroraColor2 = vec3(0.2, 0.6, uBlueIntensity); // Blue
              vec3 auroraColor3 = vec3(uPurpleIntensity, 0.2, 1.0); // Purple
              
              // Mix colors based on position and time
              float colorMix1 = sin(uv.x * uColorMixFrequency1 + uTime * uColorMixSpeed1) * 0.5 + 0.5;
              float colorMix2 = sin(uv.y * uColorMixFrequency2 + uTime * uColorMixSpeed2) * 0.5 + 0.5;
              
              vec3 finalColor = mix(auroraColor1, auroraColor2, colorMix1);
              finalColor = mix(finalColor, auroraColor3, colorMix2);
              
              // Apply aurora intensity
              finalColor *= auroraIntensity * uOverallIntensity;
              
              // Set alpha based on intensity - black parts become transparent
              float alpha = auroraIntensity * uOverallIntensity;
              
              gl_FragColor = vec4(finalColor, alpha);
            }
          `}
          vertexShader={`
            uniform float uTime;
            uniform float uScale;
            uniform float uNoiseStretch;
            uniform float uNoiseSpeed;
            varying vec2 vUv;
            
            // Perlin noise functions for vertex displacement
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
            
            float snoise(vec2 v) {
              const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                                 -0.577350269189626, 0.024390243902439);
              vec2 i  = floor(v + dot(v, C.yy) );
              vec2 x0 = v -   i + dot(i, C.xx);
              vec2 i1;
              i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
              vec4 x12 = x0.xyxy + C.xxzz;
              x12.xy -= i1;
              i = mod289(i);
              vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                              + i.x + vec3(0.0, i1.x, 1.0 ));
              vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                                    dot(x12.zw,x12.zw)), 0.0);
              m = m*m ;
              m = m*m ;
              vec3 x = 2.0 * fract(p * C.www) - 1.0;
              vec3 h = abs(x) - 0.5;
              vec3 ox = floor(x + 0.5);
              vec3 a0 = x - ox;
              m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
              vec3 g;
              g.x  = a0.x  * x0.x  + h.x  * x0.y;
              g.yz = a0.yz * x12.xz + h.yz * x12.yw;
              return 130.0 * dot(m, g);
            }
            
            void main() {
              vUv = uv;
              
              // Create animated vertex displacement using Perlin noise
              float noise = snoise(position.xy * uScale * 0.5 + uTime * uNoiseSpeed * 0.6);
              vec3 newPosition = position;
              newPosition.z += noise * 0.1; // Displace along Z-axis
              
              gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
            }
          `}
          uniforms={{
            uTime: { value: 0.0 },
            uScale: { value: config.noiseScale },
            uNoiseStretch: { value: config.noiseStretch },
            uNoiseSpeed: { value: config.noiseSpeed },
            uVerticalGradientStrength: {
              value: config.verticalGradientStrength,
            },
            uRadialGradientStrength: { value: config.radialGradientStrength },
            uGreenIntensity: { value: config.greenIntensity },
            uBlueIntensity: { value: config.blueIntensity },
            uPurpleIntensity: { value: config.purpleIntensity },
            uColorMixSpeed1: { value: config.colorMixSpeed1 },
            uColorMixSpeed2: { value: config.colorMixSpeed2 },
            uColorMixFrequency1: { value: config.colorMixFrequency1 },
            uColorMixFrequency2: { value: config.colorMixFrequency2 },
            uAuroraThreshold: { value: config.auroraThreshold },
            uAuroraBlur: { value: config.auroraBlur },
            uOverallIntensity: { value: config.overallIntensity },
          }}
        />
      </mesh>
    </>
  );
};

const Aurora = ({ config }: { config: AuroraConfig }) => {
  const { nodes } = useGLTF("/aurora.glb");
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Animate the shader material
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uScale.value = config.noiseScale;
      materialRef.current.uniforms.uNoiseStretch.value = config.noiseStretch;
      materialRef.current.uniforms.uNoiseSpeed.value = config.noiseSpeed;
      materialRef.current.uniforms.uVerticalGradientStrength.value =
        config.verticalGradientStrength;
      materialRef.current.uniforms.uRadialGradientStrength.value =
        config.radialGradientStrength;
      materialRef.current.uniforms.uGreenIntensity.value =
        config.greenIntensity;
      materialRef.current.uniforms.uBlueIntensity.value = config.blueIntensity;
      materialRef.current.uniforms.uPurpleIntensity.value =
        config.purpleIntensity;
      materialRef.current.uniforms.uColorMixSpeed1.value =
        config.colorMixSpeed1;
      materialRef.current.uniforms.uColorMixSpeed2.value =
        config.colorMixSpeed2;
      materialRef.current.uniforms.uColorMixFrequency1.value =
        config.colorMixFrequency1;
      materialRef.current.uniforms.uColorMixFrequency2.value =
        config.colorMixFrequency2;
      materialRef.current.uniforms.uAuroraThreshold.value =
        config.auroraThreshold;
      materialRef.current.uniforms.uAuroraBlur.value = config.auroraBlur;
      materialRef.current.uniforms.uOverallIntensity.value =
        config.overallIntensity;
    }
  });

  const sharedMaterial = useMemo(
    () => (
      <shaderMaterial
        ref={materialRef}
        transparent={true}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        depthTest={true}
        side={THREE.DoubleSide}
        fragmentShader={`
          uniform float uTime;
          uniform float uScale;
          uniform float uNoiseStretch;
          uniform float uNoiseSpeed;
          uniform float uVerticalGradientStrength;
          uniform float uRadialGradientStrength;
          uniform float uGreenIntensity;
          uniform float uBlueIntensity;
          uniform float uPurpleIntensity;
          uniform float uColorMixSpeed1;
          uniform float uColorMixSpeed2;
          uniform float uColorMixFrequency1;
          uniform float uColorMixFrequency2;
          uniform float uAuroraThreshold;
          uniform float uAuroraBlur;
          uniform float uOverallIntensity;
          varying vec2 vUv;
          
          // Perlin noise functions
          vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
          
          float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                               -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                            + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                                  dot(x12.zw,x12.zw)), 0.0);
            m = m*m ;
            m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
          }
          
          void main() {
            vec2 uv = vUv;
            
            // Create animated Perlin noise with scale and time, stretched along Y-axis
            float noise = snoise(vec2(uv.x * uScale + uTime * uNoiseSpeed, uv.y * uScale * uNoiseStretch));
            noise = (noise + 1.0) * 0.5; // Normalize to 0-1
            
            // Create aurora effect with vertical and radial gradients
            // Vertical gradient (top to bottom)
            float verticalGradient = pow(1.0 - uv.y, uVerticalGradientStrength);
            
            // Radial gradient from center
            vec2 center = vec2(0.5, 0.5);
            float distance = length(uv - center);
            float radialGradient = pow(1.0 - distance, uRadialGradientStrength);
            
            // Edge gradient to make mesh boundaries transparent
            float edgeGradient = 1.0;
            // Fade out at UV edges
            edgeGradient *= smoothstep(0.0, 0.1, uv.x) * smoothstep(0.0, 0.1, 1.0 - uv.x);
            edgeGradient *= smoothstep(0.0, 0.1, uv.y) * smoothstep(0.0, 0.1, 1.0 - uv.y);
            // Additional fade at corners
            float cornerDistance = length(uv - vec2(0.5, 0.5));
            edgeGradient *= smoothstep(0.7, 0.5, cornerDistance);
            
            // Mix gradients with noise
            float auroraIntensity = smoothstep(uAuroraThreshold - uAuroraBlur, uAuroraThreshold + uAuroraBlur, noise);
            auroraIntensity *= verticalGradient * radialGradient * edgeGradient;
            
            // Aurora color palette (greens, blues, purples)
            vec3 auroraColor1 = vec3(0.0, uGreenIntensity, 0.4); // Green
            vec3 auroraColor2 = vec3(0.2, 0.6, uBlueIntensity); // Blue
            vec3 auroraColor3 = vec3(uPurpleIntensity, 0.2, 1.0); // Purple
            
            // Mix colors based on position and time
            float colorMix1 = sin(uv.x * uColorMixFrequency1 + uTime * uColorMixSpeed1) * 0.5 + 0.5;
            float colorMix2 = sin(uv.y * uColorMixFrequency2 + uTime * uColorMixSpeed2) * 0.5 + 0.5;
            
            vec3 finalColor = mix(auroraColor1, auroraColor2, colorMix1);
            finalColor = mix(finalColor, auroraColor3, colorMix2);
            
            // Apply aurora intensity
            finalColor *= auroraIntensity * uOverallIntensity;
            
            // Set alpha based on intensity - black parts become transparent
            float alpha = auroraIntensity * uOverallIntensity;
            
            gl_FragColor = vec4(finalColor, alpha);
          }
        `}
        vertexShader={`
          uniform float uTime;
          uniform float uScale;
          uniform float uNoiseStretch;
          uniform float uNoiseSpeed;
          varying vec2 vUv;
          
          // Perlin noise functions for vertex displacement
          vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
          
          float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                               -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                            + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                                  dot(x12.zw,x12.zw)), 0.0);
            m = m*m ;
            m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
          }
          
          void main() {
            vUv = uv;
            
            // Create animated vertex displacement using Perlin noise
            float noise = snoise(position.xy * uScale * 0.5 + uTime * uNoiseSpeed * 0.6);
            vec3 newPosition = position;
            newPosition.z += noise * 0.1; // Displace along Z-axis
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
          }
        `}
        uniforms={{
          uTime: { value: 0.0 },
          uScale: { value: 3.0 },
          uNoiseStretch: { value: 0.05 },
          uNoiseSpeed: { value: 0.5 },
          uVerticalGradientStrength: { value: 1.0 },
          uRadialGradientStrength: { value: 1.0 },
          uGreenIntensity: { value: 0.8 },
          uBlueIntensity: { value: 1.0 },
          uPurpleIntensity: { value: 1.0 },
          uColorMixSpeed1: { value: 0.3 },
          uColorMixSpeed2: { value: 0.5 },
          uColorMixFrequency1: { value: 3.0 },
          uColorMixFrequency2: { value: 2.0 },
          uAuroraThreshold: { value: 0.6 },
          uAuroraBlur: { value: 0.3 },
          uOverallIntensity: { value: 1.0 },
        }}
      />
    ),
    []
  );

  return (
    <group dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={(nodes.aurora1 as THREE.Mesh).geometry}
      >
        {sharedMaterial}
      </mesh>
      <mesh
        castShadow
        receiveShadow
        geometry={(nodes.aurora2 as THREE.Mesh).geometry}
      >
        {sharedMaterial}
      </mesh>
      <mesh
        castShadow
        receiveShadow
        geometry={(nodes.aurora3 as THREE.Mesh).geometry}
      >
        {sharedMaterial}
      </mesh>
      <mesh
        castShadow
        receiveShadow
        geometry={(nodes.aurora4 as THREE.Mesh).geometry}
      >
        {sharedMaterial}
      </mesh>
    </group>
  );
};

useGLTF.preload("/aurora.glb");
