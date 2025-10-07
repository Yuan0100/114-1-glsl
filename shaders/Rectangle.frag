// Author @patriciogv - 2015
// http://patriciogonzalezvivo.com

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

float rect(vec2 st,vec2 center,vec2 stroke){
  // bottom-left
  vec2 bl=step(center-stroke,st)-step(stroke,st);
  float pct=bl.x*bl.y;
  
  // top-right
  vec2 tr=step(st,center+stroke);
  pct*=tr.x*tr.y;
  
  return pct;
}

float verticleLine(vec2 st,float x,float width){
  float line=step(x-width,st.x)-step(x+width,st.x);
  return line;
}

float horizontalLine(vec2 st,float y,float width){
  float line=step(y-width,st.y)-step(y+width,st.y);
  return line;
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
  
  // ===
  
  vec3 color=vec3(0.,0.,0.);
  
  float pct=verticleLine(uv,.3,.01)
  +verticleLine(uv,.72,.01)
  +verticleLine(uv,.8,.01)
  +horizontalLine(uv,.12,.01)
  +horizontalLine(uv,.6,.01)
  +horizontalLine(uv,.7,.01)
  +rect(uv,vec2(.3,.72),vec2(.3,.6));
  
  color=vec3(pct);
  
  gl_FragColor=vec4(color,1.);
}
