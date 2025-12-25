#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_tex0;// ../data/Aaron.jpg

// 玻璃和風動參數
const float u_refraction_strength=.05;// 折射強度 (例如: 0.01)
const float u_distortion_amount=.4;// 紋路隨機變形強度 (例如: 0.5)
const float u_wind_speed=1.;// 新增: 風動速度 (例如: 1.0)

// 區域限制參數
const float EFFECT_END_X=.7;// 效果結束的X座標 (3/4 處)
const float BLEND_WIDTH=.3;// 混合過渡區域的寬度

// 玻璃紋理常量
const float GROOVES_DENSITY=36.;//垂直紋路密度 (數值越大，紋路越密)
const float BLUR_SAMPLE_COUNT=3.;//模糊採樣點數量 (建議 3.0 到 5.0，數值越大越模糊但性能消耗越大)
const float BRIGHTNESS_CONTRAST=.2;// 紋路邊緣的明暗對比強度
const float WIND_FREQUENCY=20.;//風動波浪的頻率

// 顏色定義
const vec3 COLD_TONE_COLOR=vec3(.2745,.7098,1.);// 藍色
const vec3 WARM_TONE_COLOR=vec3(.9686,.3529,.2118);// 橘紅色
const float GLOBAL_COOLING_FACTOR=.5;

// 曝光參數
const float u_exposure_boost=1.5;// 曝光增益 (例如: 0.1 - 0.3)

// 簡單的隨機數生成函數
float rand(vec2 co)
{
  return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*43758.5453);
}

void main(){
  vec2 st=gl_FragCoord.xy/u_resolution.xy;
  vec2 uv=st;
  
  // 1. 處理比例適應 (Aspect Ratio Adjustment)
  float currentAspect=u_resolution.x/u_resolution.y;
  float targetAspect=2400./1344.;
  
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
  
  // 採樣原始顏色 (用於右側區域)
  vec3 original_color_raw=texture2D(u_tex0,uv).rgb;
  
  // 冷色調處理
  vec3 original_color_cooled=mix(original_color_raw,COLD_TONE_COLOR,GLOBAL_COOLING_FACTOR);
  
  // 2. 靜態紋路形狀與隨機因子計算
  vec3 effect_color=vec3(0.);// 儲存雙色調 + 玻璃效果的顏色
  float total_weight=0.;
  
  float random_factor=rand(vec2(floor(uv.x*GROOVES_DENSITY),0.));
  random_factor=mix(1.-u_distortion_amount,1.,random_factor);
  
  float base_wave=sin(uv.x*GROOVES_DENSITY);
  float static_groove_shape=base_wave*random_factor;
  
  // 3. 多重採樣與風動效果應用
  for(float i=-BLUR_SAMPLE_COUNT;i<=BLUR_SAMPLE_COUNT;i+=1.){
    vec2 sample_uv=uv;
    
    // a. 靜態紋路折射偏移
    float groove_offset=static_groove_shape*u_refraction_strength;
    
    // b. 風動擾動偏移
    float wind_wave=sin(sample_uv.y*WIND_FREQUENCY+u_time*u_wind_speed);
    float wind_offset=wind_wave*u_refraction_strength*.5;
    
    // c. 總 Y 軸偏移
    float y_total_offset=groove_offset+wind_offset+(i*u_refraction_strength*.1);
    // float x_total_offset=groove_offset+wind_offset+(i*u_refraction_strength*.1);
    
    // d. 應用偏移，得到扭曲後的採樣座標
    sample_uv.y+=y_total_offset;
    // sample_uv.x+=x_total_offset;
    
    // e. 採樣原始顏色 (關鍵: 採樣扭曲後的座標)
    vec3 sampled_color=texture2D(u_tex0,sample_uv).rgb;
    
    // ** 結合點：在此處對扭曲後的顏色進行雙色調映射 **
    
    // f. 雙色調映射 (Duotone Mapping)
    float luminance=dot(sampled_color,vec3(.2126,.7152,.0722));
    // 亮度低（陰影）映射為冷色調，亮度高（高光）映射為暖色調
    vec3 duotone_color=mix(COLD_TONE_COLOR*luminance,WARM_TONE_COLOR*luminance,luminance);
    
    // g. 紋路明暗對比 (應用在雙色調結果上)
    float contrast_factor=1.+BRIGHTNESS_CONTRAST*abs(static_groove_shape);
    vec3 final_sampled_color=duotone_color*contrast_factor;
    
    // 累積顏色
    effect_color+=final_sampled_color;
    total_weight+=1.;
  }
  
  // 歸一化模糊後的顏色 (得到完整的雙色調+玻璃效果顏色)
  effect_color/=total_weight;
  
  // 增加曝光效果
  effect_color*=(1.+u_exposure_boost);
  
  // 4. 限制區域與混合
  
  // 計算混合因子
  float blend_factor=smoothstep(EFFECT_END_X,EFFECT_END_X-BLEND_WIDTH,uv.x);
  
  // 混合最終顏色
  // blend_factor = 1.0 -> effect_color (左側)
  // blend_factor = 0.0 -> original_color (右側)
  vec3 final_color=mix(original_color_cooled,effect_color,blend_factor);
  
  // 輸出最終顏色
  gl_FragColor=vec4(final_color*mask,1.);
}