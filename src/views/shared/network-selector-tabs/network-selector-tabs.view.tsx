import { FC } from "react";
import { Chain, ChainKey } from "src/domain";
import { FromLabel } from "src/utils/labels";
import { useListStyles } from "src/views/shared/network-selector-tabs/network-selector-tabs.styles";
import { Typography } from "src/views/shared/typography/typography.view";

interface NetworkSelectorTabsProps {
  chains: Chain[];
  onClick?:any;
  chainId:number
}

export const NetworkSelectorTabs: FC<NetworkSelectorTabsProps> = ({ onClick,chains,chainId  }) => {
  const classes = useListStyles();
  return (
    <div className={classes.card}>
    <div className={classes.list}>
      {chains.map((chain) => (
        <button className={`${classes.button} ${chain.chainId === chainId ? classes.active:''}`} key={chain.key} onClick={() => {
          onClick(chain);
        }}>
          {/* <chain.Icon className={classes.icon} /> */}
          <Typography type="body1">{chain.key === ChainKey.ethereum?FromLabel.Deposit:FromLabel.Withdraw}</Typography>
        </button>
      ))}
    </div>
  </div> 
  );
};
