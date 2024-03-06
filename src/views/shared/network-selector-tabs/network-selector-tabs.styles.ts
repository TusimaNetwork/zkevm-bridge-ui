import { createUseStyles } from "react-jss";

import { Theme } from "src/styles/theme";

export const useListStyles = createUseStyles((theme: Theme) => ({
  background: {
    alignItems: "center",
    // background: theme.palette.transparency,
    display: "flex",
    height: "100vh",
    justifyContent: "center",
    padding: [0, theme.spacing(1)],
    width: "100%",
  },
  button: {
    // flex:1,
    "&:hover": {
      background: theme.palette.grey.main,
    },
    // "&:not(:first-of-type)": {
    //   marginTop: theme.spacing(1),
    // },
    lineHeight:20,
    alignItems: "center",
    background: '#fff',
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    display: "flex",
    justifyContent:'center',
    // gap: theme.spacing(1),
    padding: 10,
    transition: theme.hoverTransition,
  },
  card: {
    // maxWidth: 426,
    padding: theme.spacing(2),
    width: "100%",
    // marginBottom:20
  },
  list: {
    // "&::-webkit-scrollbar": {
    //   width: "4px",
    // },
    // "&::-webkit-scrollbar-thumb": {
    //   backgroundColor: theme.palette.grey.main,
    // },
    // "&::-webkit-scrollbar-thumb:hover": {
    //   backgroundColor: theme.palette.grey.dark,
    // },
    gap:50,
    display: "flex",
    justifyContent:'center'
    // flexDirection: "column",
    // maxHeight: 270,
    // overflowY: "auto",
  },
}));
