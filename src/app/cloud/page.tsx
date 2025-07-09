"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, Suspense, useMemo } from "react";
import * as THREE from "three";
import { useControls } from "leva";
import { ImprovedNoise } from "three/examples/jsm/math/ImprovedNoise.js";

export default function ParticlesFollower() {
  return (
    <main className="w-full h-screen">
      <Canvas camera={{ position: [0, 0, 1.5] }}>
        <color attach="background" args={["#fff"]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <OrbitControls />
        <Suspense fallback={null}>
          <Cloud />
        </Suspense>
      </Canvas>
    </main>
  );
}

const Cloud = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const controls = useControls({
    threshold: {
      value: 0.25,
      min: 0,
      max: 1,
      step: 0.01,
    },
    opacity: {
      value: 0.25,
      min: 0,
      max: 1,
      step: 0.01,
    },
    range: {
      value: 0.15,
      min: 0,
      max: 1,
      step: 0.01,
    },
    steps: {
      value: 87,
      min: 0,
      max: 200,
      step: 1,
    },
    blurStrength: {
      value: 3.1,
      min: 0,
      max: 5,
      step: 0.1,
    },
  });

  // Generate 3D noise texture
  const texture = useMemo(() => {
    const size = 128;
    const data = new Uint8Array(size * size * size);

    let i = 0;
    const scale = 0.05;
    const perlin = new ImprovedNoise();
    const vector = new THREE.Vector3();

    for (let z = 0; z < size; z++) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const d =
            1.0 -
            vector
              .set(x, y, z)
              .subScalar(size / 2)
              .divideScalar(size)
              .length();
          data[i] =
            (128 +
              128 *
                perlin.noise((x * scale) / 1.5, y * scale, (z * scale) / 1.5)) *
            d *
            d;
          i++;
        }
      }
    }

    const texture = new THREE.Data3DTexture(data, size, size, size);
    texture.format = THREE.RedFormat;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;
    return texture;
  }, []);

  // Shaders
  const vertexShader = /* glsl */ `
    in vec3 position;

    uniform mat4 modelMatrix;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform vec3 cameraPos;

    out vec3 vOrigin;
    out vec3 vDirection;

    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

      vOrigin = vec3(inverse(modelMatrix) * vec4(cameraPos, 1.0)).xyz;
      vDirection = position - vOrigin;

      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = /* glsl */ `
    precision highp float;
    precision highp sampler3D;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;

    in vec3 vOrigin;
    in vec3 vDirection;

    out vec4 color;

    uniform vec3 base;
    uniform sampler3D map;

    uniform float threshold;
    uniform float range;
    uniform float opacity;
    uniform float steps;
    uniform float frame;
    uniform float blurStrength;

    uint wang_hash(uint seed)
    {
      seed = (seed ^ 61u) ^ (seed >> 16u);
      seed *= 9u;
      seed = seed ^ (seed >> 4u);
      seed *= 0x27d4eb2du;
      seed = seed ^ (seed >> 15u);
      return seed;
    }

    float randomFloat(inout uint seed)
    {
      return float(wang_hash(seed)) / 4294967296.;
    }

    vec2 hitSphere(vec3 orig, vec3 dir) {
      float radius = 0.5;
      vec3 oc = orig;
      float a = dot(dir, dir);
      float b = 2.0 * dot(oc, dir);
      float c = dot(oc, oc) - radius * radius;
      float discriminant = b * b - 4.0 * a * c;
      
      if (discriminant < 0.0) {
        return vec2(-1.0, -1.0);
      }
      
      float t1 = (-b - sqrt(discriminant)) / (2.0 * a);
      float t2 = (-b + sqrt(discriminant)) / (2.0 * a);
      
      return vec2(t1, t2);
    }

    float sample1(vec3 p) {
      return texture(map, p).r;
    }

    float sampleBlurred(vec3 p, float blur) {
      if (blur < 0.1) return sample1(p);
      
      // texture filtering blur
      vec3 size = vec3(textureSize(map, 0));
      vec3 texelSize = 1.0 / size;
      vec3 offset = texelSize * blur * 2.0;
      
      // sample for simple blur
      float samples[8];
      samples[0] = texture(map, p + vec3(-offset.x, -offset.y, -offset.z)).r;
      samples[1] = texture(map, p + vec3( offset.x, -offset.y, -offset.z)).r;
      samples[2] = texture(map, p + vec3(-offset.x,  offset.y, -offset.z)).r;
      samples[3] = texture(map, p + vec3( offset.x,  offset.y, -offset.z)).r;
      samples[4] = texture(map, p + vec3(-offset.x, -offset.y,  offset.z)).r;
      samples[5] = texture(map, p + vec3( offset.x, -offset.y,  offset.z)).r;
      samples[6] = texture(map, p + vec3(-offset.x,  offset.y,  offset.z)).r;
      samples[7] = texture(map, p + vec3( offset.x,  offset.y,  offset.z)).r;
      
      return (samples[0] + samples[1] + samples[2] + samples[3] + 
              samples[4] + samples[5] + samples[6] + samples[7]) / 8.0;
    }

    float shading(vec3 coord) {
      float step = 0.01;
      return sample1(coord + vec3(-step)) - sample1(coord + vec3(step));
    }

    vec4 linearToSRGB(in vec4 value) {
      return vec4(mix(pow(value.rgb, vec3(0.41666)) * 1.055 - vec3(0.055), value.rgb * 12.92, vec3(lessThanEqual(value.rgb, vec3(0.0031308)))), value.a);
    }

    void main(){
      vec3 rayDir = normalize(vDirection);
      vec2 bounds = hitSphere(vOrigin, rayDir);

      if (bounds.x < 0.0 || bounds.x > bounds.y) discard;

      bounds.x = max(bounds.x, 0.0);

      vec3 p = vOrigin + bounds.x * rayDir;
      vec3 inc = 1.0 / abs(rayDir);
      float delta = min(inc.x, min(inc.y, inc.z));
      delta /= steps;

      // jitter
      uint seed = uint(gl_FragCoord.x) * uint(1973) + uint(gl_FragCoord.y) * uint(9277) + uint(frame) * uint(26699);
      vec3 size = vec3(textureSize(map, 0));
      float randNum = randomFloat(seed) * 2.0 - 1.0;
      p += rayDir * randNum * (1.0 / size);

      vec4 ac = vec4(base, 0.0);

      for (float t = bounds.x; t < bounds.y; t += delta) {
        // movement to the sampling coordinates
        vec3 offset = vec3(
          sin(frame * 0.01) * 0.1,
          cos(frame * 0.007) * 0.08,
          sin(frame * 0.013) * 0.06
        );
        float d = sampleBlurred(p + 0.5 + offset, blurStrength);

        d = smoothstep(threshold - range, threshold + range, d) * opacity;

        // calculate distance from center
        float distFromCenter = length(p);
        float boundaryFactor = smoothstep(0.45, 0.5, distFromCenter);
        
        // colors based on distance
        vec3 purpleTint = vec3(1.0, 0.2, 0.9);
        vec3 strongBlue = vec3(0.0, 0.0, 0.5); 
        
      
        float intensity = shading(p + 0.5) * 2.0 + 0.3;
        
        vec3 finalColor;
        if (boundaryFactor > 0.5) {
          finalColor = purpleTint * intensity;
        } else {
          finalColor = strongBlue * intensity;
        }

        ac.rgb += (1.0 - ac.a) * d * finalColor;

        ac.a += (1.0 - ac.a) * d;

        if (ac.a >= 0.95) break;

        p += rayDir * delta;
      }

      color = linearToSRGB(ac);

      if (color.a == 0.0) discard;
    }
  `;

  const material = useMemo(() => {
    return new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        base: { value: new THREE.Color(0x798aa0) },
        map: { value: texture },
        cameraPos: { value: new THREE.Vector3() },
        threshold: { value: controls.threshold },
        opacity: { value: controls.opacity },
        range: { value: controls.range },
        steps: { value: controls.steps },
        frame: { value: 0 },
        blurStrength: { value: controls.blurStrength },
      },
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      transparent: true,
    });
  }, [texture, controls]);

  useFrame((state) => {
    if (meshRef.current && material) {
      material.uniforms.cameraPos.value.copy(camera.position);
      material.uniforms.frame.value++;

      // update uniforms from controls
      material.uniforms.threshold.value = controls.threshold;
      material.uniforms.opacity.value = controls.opacity;
      material.uniforms.range.value = controls.range;
      material.uniforms.steps.value = controls.steps;
      material.uniforms.blurStrength.value = controls.blurStrength;
    }
  });

  return (
    <>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.5, 64, 64]} />
        <primitive object={material} />
      </mesh>
    </>
  );
};
