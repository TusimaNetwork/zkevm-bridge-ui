import React from 'react'
import 'react-loading-skeleton/dist/skeleton.css'

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';


const ValueSkeleton:React.FC<{height?:number,width?:number}> = ({height,width}) => {
    return (
      <SkeletonTheme baseColor={'rgba(100,100,100,.1)'} highlightColor={'rgba(255,255,255,.1)'}>
        <div style={{height:height || undefined, width:width || undefined}}>
          <Skeleton height={height} width={width} />
        </div>
      </SkeletonTheme>
    )
  }
  
// const ValueSkeletonPadding = styled.div<{height?:number,width?:number}>`
//   height:${props=>`${props.height}px`};
//   ${props=>props.width ? `width:${props.width}px`:null}
// `;
export default ValueSkeleton