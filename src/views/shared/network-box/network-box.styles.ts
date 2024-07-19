import { createUseStyles } from "react-jss";

import { Theme } from "src/styles/theme";

export const useNetworkBoxStyles = createUseStyles((theme: Theme) => ({
  button: {
    "&:disabled": {
      cursor: "inherit",
      opacity: 0.75,
    },
    "&:hover:not(:disabled)": {
      background: theme.palette.grey.main,
    },
    alignItems: "center",
    appearance: "none",
    background: theme.palette.grey.light,
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    display: "flex",
    padding: [theme.spacing(1), theme.spacing(1.5)],
    transition: theme.hoverTransition,
  },
  buttonIcon: {
    marginRight: theme.spacing(1),
    width: 20,
  },
  buttons: {
    alignItems: "center",
    display: "flex",
    gap: theme.spacing(4),
    textAlign: "center",
  },
  button_mini:{
    "&:disabled": {
      cursor: "inherit",
      opacity: 0.75,
    },
    "&:hover:not(:disabled)": {
      background: theme.palette.grey.main,
    },
    alignItems: "center",
    appearance: "none",
    background: theme.palette.grey.light,
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    display: "flex",
    width:130,
    padding: [theme.spacing(.5), theme.spacing(1.5)],
    transition: theme.hoverTransition, 
  },
  link: {
    color: theme.palette.primary.dark,
  },
  list: {
    paddingLeft: theme.spacing(2),
    width: "100%",
    wordBreak: "break-word",
  },
  listItem: {
    padding: [theme.spacing(0.25), 0],
  },
  list_f: {
    paddingLeft: theme.spacing(2),
    wordBreak: "break-word",
    width: "100%",
    display:'flex',
    flexDirection:'column',
    justifyContent:'space-between',
  //  display:'flex',
  //  alignItems:'center',
  //  gap:theme.spacing(2),
  //  listStyleType:'revert-layer',
   height:110,
  },
  listItem_t:{
    color: theme.palette.primary.dark
  },
  listItem_f: {

    // color: theme.palette.primary.dark,
    // padding: [theme.spacing(0.25), 0],
    // display:'flex',
    // alignItems:'center',
    // justifyContent:'space-between',
    // margin:0,
    // "&:hover:not(:disabled)": {
    //   background: theme.palette.grey.main,
    // },
  },
  networkProBox:{
    width:535,
  },
  networkBox: {
    alignItems: "center",
    display: "flex",
    flexDirection: "column",
    padding: theme.spacing(2),
  },
}));
