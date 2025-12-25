#ifdef GL_ES
precision mediump float;
#endif

// ------------------------------------
// Uniform 變數 (從外部傳入控制參數)
// ------------------------------------
uniform vec2 u_resolution;
uniform sampler2D u_tex0;// ../data/reference/CMH.png

// 陽光控制
const float u_sun_intensity=.8;// 陽光亮度 (例如: 0.3)
const float u_sun_sharpness=1.2;// 光線邊緣銳利度 (例如: 1.2)
const vec2 u_light_end=vec2(0.,1.);// 光線最暗處的 UV 座標 (P2)
const vec2 u_light_start=vec2(.6,0.);// 光線最亮處的 UV 座標 (P1)
const float u_light_width=.3;// 光線的寬度 (例如: 0.2 - 0.5)

// ------------------------------------
// 陽光照射函數：可自定義起點、終點和寬度
// ------------------------------------
vec3 applyCustomSunlight(vec3 color,vec2 uv){
  // 1. 計算光線軸向量 D (從 P1 到 P2)
  vec2 D=u_light_end-u_light_start;
  float len_sq=dot(D,D);
  
  // 檢查光線長度，避免除以零或 P1=P2
  if(len_sq<.00001){
    // 如果起點終點重合，光線無效，直接返回原色
    return color;
  }
  
  // 2. 計算向量 V (從 P1 到當前像素 uv)
  vec2 V=uv-u_light_start;
  
  // 3. 計算標量投影 t (沿著光軸 D 的位置)
  float t=dot(V,D)/len_sq;
  
  // 4. 計算垂直距離 s (垂直於光軸 D 的距離)
  // 計算 P 在 D 上的投影點 P_proj: P1 + D * t
  // P 到光軸的向量 P_to_D = V - D * t
  vec2 P_to_D=V-D*t;
  float s=length(P_to_D);// 垂直距離
  
  // 5. 建立光線遮罩
  
  // a. 沿軸遮罩 (Axial Mask): P1 處為 1.0，P2 處為 0.0
  float axial_mask=1.-t;
  axial_mask=clamp(axial_mask,0.,1.);// 限制在 P1 和 P2 之間
  
  // b. 寬度遮罩 (Width Mask): 根據 s 和 u_light_width 衰減
  // smoothstep 讓邊緣更柔和
  // 當 s < u_light_width 時為 1.0，當 s > u_light_width 加上一個小值時為 0.0
  float feather_width=.5*u_light_width;// 羽化寬度
  float width_mask=smoothstep(u_light_width,u_light_width-feather_width,s);
  
  // c. 最終遮罩 = 沿軸遮罩 * 寬度遮罩
  float light_mask=axial_mask*width_mask;
  
  // 6. 調整銳利度和應用
  light_mask=pow(light_mask,u_sun_sharpness);
  light_mask=clamp(light_mask,0.,1.);
  
  // 7. 應用光線增益
  float light_boost=light_mask*u_sun_intensity;
  
  return color*(1.+light_boost);
}

// ------------------------------------
// 7. 主程式
// ------------------------------------
void main(){
  vec2 st=gl_FragCoord.xy/u_resolution.xy;
  vec2 uv=st;//[0~1]
  
  // 計算當前螢幕比例和目標比例
  float currentAspect=u_resolution.x/u_resolution.y;
  float targetAspect=1./1.;
  
  if(currentAspect>targetAspect){
    // 螢幕太寬，裁切左右兩側
    float scale=currentAspect/targetAspect;
    uv.x=(uv.x-.5)*scale+.5;
  }else{
    // 螢幕太窄，裁切上下兩側
    float scale=targetAspect/currentAspect;
    uv.y=(uv.y-.5)*scale+.5;
  }
  
  // 創建遮罩，檢查 UV 是否在 [0,1] 範圍內
  float mask=step(0.,uv.x)*step(uv.x,1.)*
  step(0.,uv.y)*step(uv.y,1.);
  
  // 採樣原始顏色
  vec3 original_color=texture2D(u_tex0,uv).rgb;
  
  // 應用自定義陽光效果
  vec3 final_color=applyCustomSunlight(original_color,uv);
  
  // 輸出最終顏色
  gl_FragColor=vec4(final_color*mask,1.);
}