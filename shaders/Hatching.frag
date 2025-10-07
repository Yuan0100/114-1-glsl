// Author: CMH
// Title: Learning Shaders

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_tex0;// ../data/Grandma-1920.png
uniform sampler2D u_tex1;// ../data/reference/hatch_0.jpg
uniform sampler2D u_tex2;// ../data/reference/hatch_1.jpg
uniform sampler2D u_tex3;// ../data/reference/hatch_2.jpg
uniform sampler2D u_tex4;// ../data/hatch-1/hatch_4.png
uniform sampler2D u_tex5;// ../data/hatch-1/hatch_5.png
uniform sampler2D u_tex6;// ../data/hatch-1/hatch_6.png

float luminance(vec3 color){
    return dot(color,vec3(.299,.587,.114));
}

vec4 applyInkEffect(vec4 hatchColor,vec4 inkColor){
    return mix(mix(inkColor,vec4(1.),hatchColor.r),hatchColor,.5);
}

float mask(vec2 uv,float targetAspect){
    // 計算當前螢幕比例和目標比例
    float currentAspect=u_resolution.x/u_resolution.y;
    // float targetAspect=16./9.;
    
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
    
    return mask;
}

void main()
{
    vec2 st=gl_FragCoord.xy/u_resolution.xy;
    vec2 uv=st;
    
    // 計算當前螢幕比例和目標比例
    float currentAspect=u_resolution.x/u_resolution.y;
    float targetAspect=16./9.;
    
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
    
    // ===
    
    // 用裁切後的 uv 取樣主圖
    vec3 sourceColor=texture2D(u_tex0,uv).rgb;
    float shading=luminance(sourceColor);
    
    // hatch 紋理座標用原始 st，避免紋理變形
    vec2 vUv=fract(20.*st);//key
    
    vec4 c;
    float step=1./6.;
    if(shading<=step){
        c=mix(texture2D(u_tex6,vUv),texture2D(u_tex5,vUv),6.*shading);
    }
    if(shading>step&&shading<=2.*step){
        c=mix(texture2D(u_tex5,vUv),texture2D(u_tex4,vUv),6.*(shading-step));
    }
    if(shading>2.*step&&shading<=3.*step){
        c=mix(texture2D(u_tex4,vUv),texture2D(u_tex3,vUv),6.*(shading-2.*step));
    }
    if(shading>3.*step&&shading<=4.*step){
        c=mix(texture2D(u_tex3,vUv),texture2D(u_tex2,vUv),6.*(shading-3.*step));
    }
    if(shading>4.*step&&shading<=5.*step){
        c=mix(texture2D(u_tex2,vUv),texture2D(u_tex1,vUv),6.*(shading-4.*step));
    }
    if(shading>5.*step){
        c=mix(texture2D(u_tex1,vUv),vec4(1.),6.*(shading-5.*step));
    }
    
    // 根據亮度動態調整墨水顏色
    vec4 coldInkColor=vec4(.0627,.2431,.898,1.);// 冷色調 (藍色系)
    vec4 warmInkColor=vec4(.8627,.2824,.0706,1.);// 暖色調 (橙色系)
    
    // 使用 smoothstep 創造平滑的過渡
    float temperatureFactor=smoothstep(.2,.5,shading);
    vec4 inkColor=mix(coldInkColor,warmInkColor,temperatureFactor);
    
    vec4 finalColor=applyInkEffect(c,inkColor);
    
    // ===
    
    // 線性混合 (保留原圖顏色)
    vec3 blendedColor=mix(sourceColor,finalColor.rgb,.3);
    
    gl_FragColor=vec4(blendedColor*mask,1.);
}