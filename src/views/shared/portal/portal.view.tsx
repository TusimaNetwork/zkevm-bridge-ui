import { FC, PropsWithChildren, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

import { usePortalStyles } from "src/views/shared/portal/portal.styles";

export const Portal: FC<{children:any,show:boolean}> = ({ children,show }) => {
  const classes = usePortalStyles();
  // const portalRoot = document.querySelector("#fullscreen-modal");
  // const divElement = document.createElement("div");

  // divElement.classList.add(classes.fullScreenModal);

  return show?<div className={classes.fullScreenModal}>
  {children}
</div>:''
  // useLayoutEffect(() => {
  //   if (portalRoot) {
  //     portalRoot.appendChild(divElement);

  //     return () => {
  //       portalRoot.removeChild(divElement);
  //     };
  //   }
  // }, [portalRoot, divElement]);

  // return createPortal(children, divElement);
};
