#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_tex0;// ../data/Cat.png

const float u_refraction_strength=.07;// 折射強度 (例如: 0.01)
const float u_distortion_amount=.5;// 紋路隨機變形強度 (例如: 0.5)
const float u_wind_speed=.5;// 新增: 風動速度 (例如: 1.0)

const float GROOVES_DENSITY=50.;// 垂直紋路密度 (數值越大，紋路越密)
const float BLUR_SAMPLE_COUNT=3.;// 模糊採樣點數量 (建議 3.0 到 5.0，數值越大越模糊但性能消耗越大)
const float BRIGHTNESS_CONTRAST=.3;// 紋路邊緣的明暗對比強度
const float WIND_FREQUENCY=5.;// 風動波浪的頻率
const float EFFECT_END_X=.7;// 效果結束的X座標 (3/4 處)
const float BLEND_WIDTH=.3;// 混合過渡區域的寬度

// 簡單的隨機數生成函數 (在此版本中可能不再直接使用，但保留以防萬一)
float rand(vec2 co)
{
  return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*43758.5453);
}

void main(){
  vec2 st=gl_FragCoord.xy/u_resolution.xy;
  vec2 uv=st;
  
  // 1. 處理比例適應 (Aspect Ratio Adjustment)
  float currentAspect=u_resolution.x/u_resolution.y;
  float targetAspect=1./1.;
  
  if(currentAspect>targetAspect){
    float scale=currentAspect/targetAspect;
    uv.x=(uv.x-.5)*scale+.5;
  }else{
    float scale=targetAspect/currentAspect;
    uv.y=(uv.y-.5)*scale+.5;
  }
  
  // 創建遮罩 (Masking)
  float mask=step(0.,uv.x)*step(uv.x,1.)*
  step(0.,uv.y)*step(uv.y,1.);
  
  vec3 original_color=texture2D(u_tex0,uv).rgb;
  
  // 2. 靜態紋路形狀與隨機因子計算
  
  // vec3 final_color=vec3(0.);
  vec3 effect_color=vec3(0.);// 專門儲存玻璃效果的顏色
  float total_weight=0.;
  
  // 為每條紋路計算一個靜態隨機因子
  float random_factor=rand(vec2(floor(uv.x*GROOVES_DENSITY),0.));
  random_factor=mix(1.-u_distortion_amount,1.,random_factor);
  
  // 靜態紋路波形：只依賴 X 座標，不依賴時間
  float base_wave=sin(uv.x*GROOVES_DENSITY);
  // 靜態紋路形狀 (長虹玻璃的凹凸形狀)
  float static_groove_shape=base_wave*random_factor;
  
  // 3. 多重採樣與風動效果應用
  for(float i=-BLUR_SAMPLE_COUNT;i<=BLUR_SAMPLE_COUNT;i+=1.){
    vec2 sample_uv=uv;
    
    // ** 分離風動效果 **
    
    // a. 紋路折射偏移：由靜態的玻璃形狀決定
    float groove_offset=static_groove_shape*u_refraction_strength;
    
    // b. 風動擾動偏移：由 Y 座標和時間決定 (模擬圖片內容的流動)
    float wind_wave=sin(sample_uv.y*WIND_FREQUENCY+u_time*u_wind_speed);
    float wind_offset=wind_wave*u_refraction_strength*.5;// 風動影響強度減半
    
    // c. 結合兩種偏移和模糊偏移 (i)
    // 總 Y 軸偏移 = 靜態紋路 + 動態風動 + 模糊採樣
    float y_total_offset=groove_offset+wind_offset+(i*u_refraction_strength*.1);
    float x_total_offset=groove_offset+wind_offset+(i*u_refraction_strength*.1);
    
    // d. 應用偏移
    sample_uv.y+=y_total_offset;
    sample_uv.x+=x_total_offset;
    
    // e. 採樣原始顏色 (!!! 移除雙色調邏輯 !!!)
    vec3 sampled_color=texture2D(u_tex0,sample_uv).rgb;
    
    // f. 紋路明暗對比 (用於強調靜態紋理邊緣)
    // 紋路邊緣的對比度，只依賴靜態的 static_groove_shape
    float contrast_factor=1.+BRIGHTNESS_CONTRAST*abs(static_groove_shape);
    vec3 final_sampled_color=sampled_color*contrast_factor;
    
    // 累積顏色
    // final_color+=final_sampled_color;
    effect_color+=final_sampled_color;
    total_weight+=1.;
  }
  
  // 歸一化模糊後的顏色
  // final_color/=total_weight;
  effect_color/=total_weight;
  
  // 限制區域與混合
  float blend_factor=smoothstep(EFFECT_END_X,EFFECT_END_X-BLEND_WIDTH,uv.x);
  
  // 混合最終顏色
  vec3 final_color=mix(original_color,effect_color,blend_factor);
  
  // 輸出最終顏色
  gl_FragColor=vec4(final_color*mask,1.);
}