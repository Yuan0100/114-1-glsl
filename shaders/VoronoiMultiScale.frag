// Author:CMH
// Title:input image and kernel

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
// uniform sampler2D u_tex0;// ../data/NYCU_GBT-Hybrid-painting-withBall.png
uniform sampler2D u_tex0;// ../data/reference/MonaLisa.jpg
// uniform sampler2D u_tex1;

const float MIN_SCALE=10.;
const float MAX_SCALE=100.;
// const float targetAspect=1.;
const float targetAspect=16./9.;

// 2D 隨機函式
float random(in vec2 st);
vec3 voronoi(in vec2 st);
vec2 aspect(in vec2 st,in vec2 res,in float target,out float mask);

void main(){
  vec2 st=gl_FragCoord.xy/u_resolution.xy;
  
  // 寬比校正並取得遮罩
  float mask;
  vec2 masked_st=aspect(st,u_resolution,targetAspect,mask);
  
  // 取得局部顏色與亮度
  vec3 local_color=texture2D(u_tex0,masked_st).rgb;
  
  const int j=6;
  float dynamic_scale;
  float luminance=(local_color.r+local_color.g+local_color.b)/3.;
  for(int i=0;i<j;i++){
    float threshold=float(i+1)/float(j);
    
    if(luminance<threshold){
      // 計算這個區間對應的 scale。
      // i=0 (最暗) -> scale 接近 MAX_SCALE
      // i=j-1 (最亮) -> scale 接近 MIN_SCALE
      // 我們使用 i / (j-1) 作為 mix 的因子
      float factor=float(i)/float(j-1);
      dynamic_scale=mix(MAX_SCALE,MIN_SCALE,factor);
      break;// 找到對應區間，賦值後就跳出迴圈
    }
  }
  
  // 亮度越低 (接近0)，scale 越接近 MAX_SCALE
  // 亮度越高 (接近1)，scale 越接近 MIN_SCALE
  // float dynamic_scale=mix(MAX_SCALE,MIN_SCALE,luminance);
  // dynamic_scale=mix(MAX_SCALE,MIN_SCALE,luminance);
  
  // 放大座標以建立更多網格
  vec2 scaled_st=masked_st*dynamic_scale;
  
  // 計算 Voronoi
  vec3 voronoi_data=voronoi(scaled_st);
  vec2 point_uv=voronoi_data.xy/dynamic_scale;
  float dist=voronoi_data.z;
  
  // 根據特徵點位置進行紋理採樣
  vec3 color=texture2D(u_tex0,point_uv).rgb;
  
  // 讓顏色隨距離變暗
  // color-=dist*.1;
  
  gl_FragColor=vec4(color*mask,1.);
}

// ===============================
// Helper functions
// ===============================

// 2D 隨機函式
float random(in vec2 st){
  return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);
}

// Voronoi 計算函式
// 輸入：縮放後的 st 座標
// 輸出：vec3(最近特徵點座標.xy, 到該點的距離.z)
vec3 voronoi(in vec2 st){
  vec2 i_st=floor(st);
  vec2 f_st=fract(st);
  
  float m_dist=1.;// 初始化最小距離為 1
  vec2 m_point;// 儲存最近的特徵點位置
  
  for(int y=-1;y<=1;y++){
    for(int x=-1;x<=1;x++){
      vec2 neighbor=vec2(float(x),float(y));
      
      vec2 point;
      point.x=random(i_st+neighbor);
      point.y=random(i_st+neighbor+vec2(1.));
      
      vec2 diff=neighbor+point-f_st;
      float dist=length(diff);
      
      if(dist<m_dist){
        m_dist=dist;
        m_point=i_st+neighbor+point;
      }
    }
  }
  return vec3(m_point,m_dist);
}

// 長寬比校正與遮罩函式
// 輸出：校正後的 st 座標
// out mask: 1.0 代表在範圍內, 0.0 代表在範圍外
vec2 aspect(in vec2 st,in vec2 res,in float target,out float mask){
  vec2 corrected_st=st;
  float currentAspect=res.x/res.y;
  mask=1.;
  
  if(currentAspect>target){
    float scale=currentAspect/target;
    corrected_st.x=(st.x-.5)*scale+.5;
  }else{
    float scale=target/currentAspect;
    corrected_st.y=(st.y-.5)*scale+.5;
  }
  
  // 檢查校正後的座標是否在 [0,1] 範圍內，如果不是，就將 mask 設為 0
  if(corrected_st.x<0.||corrected_st.x>1.||corrected_st.y<0.||corrected_st.y>1.){
    mask=0.;
  }
  
  return corrected_st;
}