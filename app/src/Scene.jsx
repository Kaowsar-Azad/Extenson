import { useRef, useMemo, useEffect } from 'react'
import { Text3D, Center, ContactShadows } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

// World-Class Multi-Style 3D Typography Shader with Front-Face Gradient Engine
const MultiStyleTypographyShader = {
  uniforms: {
    uStyleMode: { value: 0 }, // 0: Holographic Crystal, 1: Liquid Chrome, 2: Risograph Velvet, 3: Dark Obsidian Neon
    uColorTopLeft: { value: new THREE.Color('#ff5500') },
    uColorBottomLeft: { value: new THREE.Color('#ff007f') },
    uColorBottomCurve: { value: new THREE.Color('#00e5ff') },
    uColorTopRight: { value: new THREE.Color('#a855f7') },
    uBodyGradStart: { value: new THREE.Color('#081426') },
    uBodyGradMid: { value: new THREE.Color('#102d4c') },
    uBodyGradEnd: { value: new THREE.Color('#0a1d33') },
    uBodyGradAngle: { value: 45.0 },
    uColorAccent: { value: new THREE.Color('#ffee00') },
    uFresnelPower: { value: 2.3 },
    uCausticIntensity: { value: 2.2 },
    uSpecularIntensity: { value: 1.4 },
    uRimIntensity: { value: 1.2 },
    uLightDir1: { value: new THREE.Vector3(0.8, 1.3, 1.5).normalize() },
    uLightDir2: { value: new THREE.Vector3(-1.1, -0.8, 1.2).normalize() },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vLocalPosition = position;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform int uStyleMode;
    uniform vec3 uColorTopLeft;
    uniform vec3 uColorBottomLeft;
    uniform vec3 uColorBottomCurve;
    uniform vec3 uColorTopRight;
    uniform vec3 uBodyGradStart;
    uniform vec3 uBodyGradMid;
    uniform vec3 uBodyGradEnd;
    uniform float uBodyGradAngle;
    uniform vec3 uColorAccent;

    uniform float uFresnelPower;
    uniform float uCausticIntensity;
    uniform float uSpecularIntensity;
    uniform float uRimIntensity;
    uniform vec3 uLightDir1;
    uniform vec3 uLightDir2;

    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;

    vec3 spectralCosine(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
      return a + b * cos(6.2831853 * (c * t + d));
    }

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);

      float NdotV = max(0.0, dot(normal, viewDir));
      float fresnel = pow(1.0 - NdotV, uFresnelPower);
      float edgeMask = smoothstep(0.10, 0.82, fresnel);

      vec3 p = vLocalPosition;

      // 1. Front-Face 2D Gradient Mapping along the body of the letter
      float rad = uBodyGradAngle * 3.14159265 / 180.0;
      vec2 centeredPos = p.xy - vec2(1.2, 1.4);
      vec2 rotPos = vec2(
        centeredPos.x * cos(rad) - centeredPos.y * sin(rad),
        centeredPos.x * sin(rad) + centeredPos.y * cos(rad)
      );
      float gradCoord = clamp((rotPos.y + 1.6) / 3.2, 0.0, 1.0);

      // Smooth 3-stop multi-gradient across the letter's front face
      vec3 frontFaceGradient = mix(uBodyGradStart, uBodyGradMid, smoothstep(0.0, 0.5, gradCoord));
      frontFaceGradient = mix(frontFaceGradient, uBodyGradEnd, smoothstep(0.5, 1.0, gradCoord));

      // 2. Exact Localized Multi-Zone Caustic Lighting along the Bevels
      float topAmberDist = length((p.xy - vec2(0.35, 2.1)) * vec2(1.0, 1.15));
      float topAmberGlow = smoothstep(1.35, 0.08, topAmberDist);
      vec3 topAmberColor = uColorTopLeft;

      float botMagentaDist = length((p.xy - vec2(0.2, 0.45)) * vec2(1.1, 1.0));
      float botMagentaGlow = smoothstep(1.15, 0.08, botMagentaDist);
      vec3 botMagentaColor = uColorBottomLeft;

      float botCyanDist = length((p.xy - vec2(1.35, 0.15)) * vec2(1.0, 1.2));
      float botCyanGlow = smoothstep(1.25, 0.08, botCyanDist);
      vec3 botCyanColor = uColorBottomCurve;

      float topVioletDist = length((p.xy - vec2(1.95, 2.35)) * vec2(1.0, 1.0));
      float topVioletGlow = smoothstep(1.05, 0.08, topVioletDist);
      vec3 topVioletColor = uColorTopRight;

      vec3 localizedCaustics = 
          topAmberColor * topAmberGlow + 
          botMagentaColor * botMagentaGlow + 
          botCyanColor * botCyanGlow + 
          topVioletColor * topVioletGlow;

      vec3 finalColor = vec3(0.0);

      // ============================================================
      // STYLE 0: HOLOGRAPHIC FROSTED CRYSTAL GLASS WITH BODY GRADIENT
      // ============================================================
      if (uStyleMode == 0) {
        vec3 deepSmokyGlass = frontFaceGradient * 0.6;
        vec3 translucentGlass = frontFaceGradient * 1.3 + vec3(0.02, 0.05, 0.09);
        vec3 glassCore = mix(deepSmokyGlass, translucentGlass, pow(NdotV, 1.4));
        glassCore += localizedCaustics * (1.0 - NdotV) * 0.28;

        finalColor = mix(glassCore, localizedCaustics * uCausticIntensity + frontFaceGradient * 0.4, edgeMask);

        // Dual Specular reflections
        vec3 halfVec1 = normalize(uLightDir1 + viewDir);
        float NdotH1 = max(0.0, dot(normal, halfVec1));
        float specSoft = pow(NdotH1, 24.0) * 0.30;
        float specSharp = pow(NdotH1, 110.0) * 0.90;

        vec3 halfVec2 = normalize(uLightDir2 + viewDir);
        float NdotH2 = max(0.0, dot(normal, halfVec2));
        float specRim = pow(NdotH2, 60.0) * 0.40;

        finalColor += (specSoft + specSharp + specRim) * vec3(1.0) * uSpecularIntensity;
        finalColor += pow(fresnel, 4.5) * uRimIntensity * vec3(0.96, 0.98, 1.0);

        // Frosted sandblasted crystal grain
        float grain = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.02;
        finalColor += grain;
      }

      // ============================================================
      // STYLE 1: LIQUID CHROME / Y2K PRISMATIC METAL (Reference '5')
      // ============================================================
      else if (uStyleMode == 1) {
        vec3 reflectDir = reflect(-viewDir, normal);
        float chromeAngle = reflectDir.y * 3.1415 + reflectDir.x * 2.0 + vWorldPosition.y * 0.5;
        
        vec3 iridescentChrome = spectralCosine(chromeAngle * 0.4, 
          vec3(0.55, 0.55, 0.55),
          vec3(0.45, 0.45, 0.45),
          vec3(1.0, 1.0, 1.0),
          vec3(0.0, 0.33, 0.67)
        );

        float metalFresnel = pow(1.0 - NdotV, 1.8);
        vec3 chromeCore = mix(frontFaceGradient * 1.5 + vec3(0.4), iridescentChrome, 0.65);
        
        float band = sin(reflectDir.y * 12.0 + reflectDir.z * 6.0) * 0.5 + 0.5;
        chromeCore = mix(chromeCore * 0.15, chromeCore * 1.4, pow(band, 2.0));

        finalColor = mix(chromeCore, localizedCaustics * 1.8 + iridescentChrome * 1.2, metalFresnel * 0.85);

        vec3 halfVec = normalize(uLightDir1 + viewDir);
        float spec = pow(max(0.0, dot(normal, halfVec)), 140.0) * 2.2;
        finalColor += spec * vec3(1.0);
      }

      // ============================================================
      // STYLE 2: RISOGRAPH VELVET GRAIN MATTE (Reference 'A')
      // ============================================================
      else if (uStyleMode == 2) {
        float diffuse1 = max(0.0, dot(normal, uLightDir1));
        float diffuse2 = max(0.0, dot(normal, uLightDir2));
        float totalDiffuse = diffuse1 * 0.75 + diffuse2 * 0.35;

        vec3 shadowColor = frontFaceGradient * 0.35;
        vec3 baseTone = frontFaceGradient;
        vec3 highlightTone = frontFaceGradient * 1.8 + vec3(0.2, 0.1, 0.1);

        vec3 matteColor = mix(shadowColor, baseTone, smoothstep(0.1, 0.65, totalDiffuse));
        matteColor = mix(matteColor, highlightTone, smoothstep(0.65, 0.98, totalDiffuse));

        float stipple = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.12;
        matteColor += stipple * (1.0 - smoothstep(0.2, 0.8, totalDiffuse));

        finalColor = matteColor;
      }

      // ============================================================
      // STYLE 3: CYBER DARK OBSIDIAN & NEON MATRIX
      // ============================================================
      else {
        vec3 obsidianBody = frontFaceGradient * 0.3 + vec3(0.01, 0.015, 0.025);
        float neonFresnel = pow(1.0 - NdotV, 3.2);

        finalColor = mix(obsidianBody, localizedCaustics * 2.8, neonFresnel);

        float razorGlint = pow(1.0 - NdotV, 6.0) * 2.0;
        finalColor += razorGlint * uColorAccent;
      }

      gl_FragColor = vec4(finalColor, 0.96);
    }
  `
}

export default function Scene({ text, colors, styleMode = 0 }) {
  const meshRef = useRef()

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(MultiStyleTypographyShader.uniforms),
      vertexShader: MultiStyleTypographyShader.vertexShader,
      fragmentShader: MultiStyleTypographyShader.fragmentShader,
      transparent: true,
      side: THREE.FrontSide
    })
  }, [])

  // Sync uniforms instantly
  useEffect(() => {
    if (!shaderMaterial || !colors) return
    shaderMaterial.uniforms.uStyleMode.value = styleMode
    shaderMaterial.uniforms.uColorTopLeft.value.set(colors.topLeft)
    shaderMaterial.uniforms.uColorBottomLeft.value.set(colors.bottomLeft)
    shaderMaterial.uniforms.uColorBottomCurve.value.set(colors.bottomCurve)
    shaderMaterial.uniforms.uColorTopRight.value.set(colors.topRight)
    
    // Front Face Body Gradient
    shaderMaterial.uniforms.uBodyGradStart.value.set(colors.bodyStart || colors.glassBody || '#081426')
    shaderMaterial.uniforms.uBodyGradMid.value.set(colors.bodyMid || colors.glassBody || '#102d4c')
    shaderMaterial.uniforms.uBodyGradEnd.value.set(colors.bodyEnd || colors.glassBody || '#0a1d33')
    shaderMaterial.uniforms.uBodyGradAngle.value = colors.bodyAngle !== undefined ? colors.bodyAngle : 45.0
    
    shaderMaterial.uniforms.uColorAccent.value.set(colors.accent || '#ffee00')
  }, [shaderMaterial, colors, styleMode])

  return (
    <>
      {/* 3D Typography with smooth fillets */}
      <Center>
        <group rotation={[0.16, 0.28, -0.02]} position={[0, 0, 0]}>
          <Text3D
            ref={meshRef}
            font="/helvetiker_bold.typeface.json"
            size={3.3}
            height={1.05}
            curveSegments={64}
            bevelEnabled
            bevelThickness={0.24}
            bevelSize={0.16}
            bevelOffset={0}
            bevelSegments={32}
            material={shaderMaterial}
          >
            {text || ' '}
          </Text3D>
        </group>
      </Center>

      {/* Floor Contact Shadow */}
      <ContactShadows
        position={[0, -2.5, 0]}
        opacity={0.5}
        scale={10}
        blur={2.5}
        far={4}
        color="#001833"
      />

      {/* High-End Bloom Glow */}
      <EffectComposer disableNormalPass multisampling={4}>
        <Bloom
          luminanceThreshold={0.65}
          luminanceSmoothing={0.5}
          intensity={0.55}
          radius={0.5}
          mipmapBlur
        />
      </EffectComposer>
    </>
  )
}
