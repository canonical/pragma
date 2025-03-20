const d="ds-baseline-grid-addon",s=`${d}`,{useEffect:r,useGlobals:c}=__STORYBOOK_MODULE_PREVIEW_API__,b=a=>{const[l]=c(),o=l[s],e="with-baseline-grid",n="baseline-grid-style",i=`
  :root {
    --addon-baseline-grid-color: var(--baseline-grid-color, rgba(255, 0, 0, 0.2));
    --addon-baseline-height: var(--baseline-height, 0.5rem);
    --addon-baseline-shift: var(--baseline-shift, 0);
  }
  .${e} {
    position: relative;
  
    &::after {
      background: linear-gradient(
        to top,
        var(--addon-baseline-grid-color),
        var(--addon-baseline-grid-color) 1px,
        transparent 1px,
        transparent
      );
      background-size: 100% var(--addon-baseline-height);
      background-position: 0 var(--addon-baseline-shift);
      bottom: 0;
      content: "";
      display: block;
      left: 0;
      pointer-events: none;
      position: absolute;
      right: 0;
      top: 0;
      z-index: 200;
    }
  }
  `;return r(()=>{if(!global.document.getElementById(n)){const t=global.document.createElement("style");t.id=n,t.textContent=i,global.document.head.appendChild(t)}o?global.document.body.classList.add(e):global.document.body.classList.remove(e)},[o]),a()},p={decorators:[b],initialGlobals:{[s]:!1}};export{p as default};
