// Author: CMH
// Title: Learning Shaders

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_tex0;
uniform sampler2D u_tex1;
uniform sampler2D u_tex2;
uniform sampler2D u_tex3;
uniform sampler2D u_tex4;
uniform sampler2D u_tex5;
uniform sampler2D u_tex6;

float luminance(vec3 color){
    return dot(color,vec3(.299,.587,.114));
}

vec4 applyInkEffect(vec4 hatchColor,vec4 inkColor){
    return mix(mix(inkColor,vec4(1.),hatchColor.r),hatchColor,.5);
}

void main()
{
    vec2 uv=gl_FragCoord.xy/u_resolution.xy;
    vec2 vUv=fract(20.*uv);//key
    // uv.x*=u_resolution.x/u_resolution.y;
    vec3 sourceColor=texture2D(u_tex0,uv).rgb;
    float shading=luminance(sourceColor);
    // float shading=texture2D(u_tex0,uv).g;//取MonaLisa綠色版作為明亮值
    
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
    
    // vec4 inkColor=vec4(0.,0.,1.,1.);
    // vec4 src=mix(mix(inkColor,vec4(1.),c.r),c,.5);
    
    // 根據亮度動態調整墨水顏色
    vec4 coldInkColor=vec4(.0627,.2431,.898,1.);// 冷色調 (藍色系)
    vec4 warmInkColor=vec4(.8627,.2824,.0706,1.);// 暖色調 (橙色系)
    
    // 使用 smoothstep 創造平滑的過渡
    float temperatureFactor=smoothstep(.2,.5,shading);
    vec4 inkColor=mix(coldInkColor,warmInkColor,temperatureFactor);
    
    vec4 finalColor=applyInkEffect(c,inkColor);
    
    // 線性混合 (保留原圖顏色)
    vec3 blendedColor=mix(sourceColor,finalColor.rgb,.3);
    
    // gl_FragColor=finalColor;
    gl_FragColor=vec4(blendedColor,1.);
    
    // gl_FragColor=src;
}