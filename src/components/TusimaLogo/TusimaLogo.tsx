import React from "react"
import TusimaLogoIcon from "src/assets/img/tusima-02.png";

const TusimaLogo: React.FC<{className?:string,size?:any}> = ({size,className}) => {
  return  <img width={size} className={className} src={TusimaLogoIcon}/>
}
export default TusimaLogo

