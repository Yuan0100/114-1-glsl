precision mediump float;
varying vec2 vUv;
uniform sampler2D u_texture;// ../data/wavewave_logo.png
uniform float u_scroll;
uniform vec2 u_resolution;
uniform float u_time;

void main(){
  // --- 1. 波浪變形 ---
  // 效果強度、頻率和速度
  float waveAmplitude=u_scroll*.05;// 波浪的最大偏移量
  float waveFrequency=u_scroll*30.;// 波浪的數量
  float waveSpeed=1.;// 波浪的滾動速度
  
  // 計算水平方向的位移
  float x_displacement=sin(vUv.y*waveFrequency+waveSpeed*u_time)*waveAmplitude;
  vec2 distortedUV=vec2(vUv.x+x_displacement,vUv.y);
  
  // --- 2. 橫向高斯模糊 (來自你的範例) ---
  float blurStrength=u_scroll*300.;// 控制模糊的最大強度
  vec2 texelSize=vec2(1.)/u_resolution;
  
  // 高斯權重 (中心點 0.5, 兩側各 0.25)
  float weights[2]=float[](.5,.25);
  
  // 計算水平偏移量
  vec2 horizontalOffset=vec2(texelSize.x*blurStrength,0.);
  
  // 進行 3-tap 橫向高斯模糊採樣
  vec4 blurColor=vec4(0.);
  blurColor+=texture2D(u_texture,distortedUV)*weights[0];// 中心點
  blurColor+=texture2D(u_texture,vUv+horizontalOffset)*weights[1];// 右側
  blurColor+=texture2D(u_texture,vUv-horizontalOffset)*weights[1];// 左側
  
  // --- 3. 組合效果 ---
  // 些微發光擴散：稍微提高模糊後的顏色亮度
  float glow=u_scroll*.8;// 較低的發光強度，效果更細微
  vec3 finalRGB=blurColor.rgb+glow;
  
  // 整體顏色變淡 (Desaturation)
  float luminance=dot(finalRGB,vec3(.299,.587,.114));
  vec3 grayColor=vec3(luminance);
  finalRGB=mix(finalRGB,grayColor,u_scroll);
  
  // --- 4. 最終透明度 ---
  float alpha=smoothstep(.8,.4,u_scroll);
  
  gl_FragColor=vec4(finalRGB,blurColor.a*alpha);
}