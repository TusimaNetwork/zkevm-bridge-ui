import React from "react"
import { useHeaderStyles } from "src/views/home/components/header/header.styles"
import Logo from "../TusimaLogo"

const PolygonZkEVMLogo: React.FC<{className?:string}> = ({className}) => {
  const classes = useHeaderStyles();
  return (
    <div className={`${classes.head_logo} ${className}`}>
      <Logo size={40} />
      <div className="title">
        <span>Tusima</span> Eagle 
      </div>
    </div>
  )
}
export default PolygonZkEVMLogo;
