#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;

// 產生一個偽隨機數
float random(in vec2 st){
  return fract(
    sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123
  );
}

// 2D Value Noise
float noise(in vec2 st){
  vec2 i=floor(st);// 整數部分
  vec2 f=fract(st);// 小數部分
  
  // 取得格線四個角落的隨機值
  float a=random(i);
  float b=random(i+vec2(1.,0.));
  float c=random(i+vec2(0.,1.));
  float d=random(i+vec2(1.,1.));
  
  // 使用 smoothstep 進行平滑內插
  vec2 u=f*f*(3.-2.*f);
  
  // 在 x 軸和 y 軸上進行混合
  return mix(a,b,u.x)+
  (c-a)*u.y*(1.-u.x)+
  (d-b)*u.y*u.x;
}

void main(){
  vec2 st=gl_FragCoord.xy/u_resolution.xy;
  // 調整座標比例，讓雜訊更明顯
  st*=10.;
  
  // 計算雜訊值
  float n=noise(st);
  
  // 輸出顏色
  gl_FragColor=vec4(vec3(n),1.);
}

