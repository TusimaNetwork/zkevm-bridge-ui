import React from "react"
import { useHeaderStyles } from "src/views/home/components/header/header.styles"
import Logo from "../TusimaLogo"

const PolygonZkEVMLogo: React.FC = () => {
  const classes = useHeaderStyles();
  return (
    <div className={classes.head_logo}>
      <Logo size={40} />
      <div className="title">
        <span>Tusima</span> Eagle 
      </div>
    </div>
  )
}
export default PolygonZkEVMLogo;
