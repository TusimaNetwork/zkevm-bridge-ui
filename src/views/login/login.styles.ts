import { createUseStyles } from "react-jss";

import { Theme } from "src/styles/theme";

export const useLoginStyles = createUseStyles((theme: Theme) => ({
  appName: {
    background: theme.palette.grey.main,
    borderRadius: 56,
    margin: "0px auto",
    marginBottom: theme.spacing(5),
    padding: [theme.spacing(1.25), theme.spacing(4)],
  },
  card: {
    display: "flex",
    flexDirection: "column",
    margin: [0, "auto", theme.spacing(3)],
  },
  cardHeader: {
    padding: [theme.spacing(3), theme.spacing(4), theme.spacing(2)],
  },
  loginHeader: {
    display:'flex',
    alignItems:'center',
    justifyContent:'space-between'
  },
  loginButton: {
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
  cardHeaderCentered: {
    textAlign: "center",
  },
  cardWrap: {
    margin: [theme.spacing(3), 0],
    width: "100%",
  },
  contentWrapper: {
    alignItems: "center",
    display: "flex",
    flexDirection: "column",
    margin: "auto",
    maxWidth: theme.maxWidth,
    width: "100%",
  },
  login: {
    display: "flex",
    flexDirection: "column",
    padding: [0, theme.spacing(2)],
  },
  logo: {
    height: 120,
    marginBottom: theme.spacing(3),
    marginTop: theme.spacing(8),
  },
  networkBoxWrapper: {
    margin: [0, "auto", theme.spacing(3)],
    maxWidth: theme.maxWidth,
    width: "100%",
  },
}));
