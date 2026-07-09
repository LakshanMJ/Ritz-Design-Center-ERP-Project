import { alpha, darken } from "@mui/material";
import { blue, grey, red } from "@mui/material/colors";

export const Components = {
    MuiPaper: {
        defaultProps: {
            elevation: 2
        }
    },
    MuiMenu: {
        defaultProps: {
            elevation: 2
        }
    },
    MuiButtonBase: {
        defaultProps: {
            disableRipple: true,
        },
    },
    MuiInputBase: {
        styleOverrides: {
            input: {
                background: '#ffffff',
                '&[readonly]': {
                    background: grey[50],
                }
            }
        }
    },
    MuiLink: {
        styleOverrides: {
            root: {
                ':not(:hover)': {
                    textDecoration: 'none'
                }
            }
        }
    },
    MuiButton: {
        styleOverrides: {
            root: {
                // borderRadius: '5px'
            },
            text: {
                '&:focus': {
                    background: grey[300]
                }
            },
            textPrimary: {
                '&:hover': {
                    background: alpha(blue[100], 0.4)
                },
                '&:focus': {
                    background: alpha(blue[100], 0.8)
                }
            },
            textError: {
                '&:hover': {
                    background: alpha(red[100], 0.4)
                },
                '&:focus': {
                    background: alpha(red[100], 0.8)
                }
            },
            contained: {
                boxShadow: 'none',
                '&:hover, &:focus, &:active': {
                    boxShadow: 'none'
                }
            },
            containedPrimary: {
                background: blue[700],
                '&:hover': {
                    background: darken(blue[700], .15)
                },
                '&:focus': {
                    background: darken(blue[700], .3)
                }
            },
            outlined: {
                background: '#ffffff'
            }
        }
    },
    MuiIconButton: {
        styleOverrides: {
            root: {
                // borderRadius: '10px',
                '&:focus': {
                    background: grey[300]
                }
            },
            colorPrimary: {
                '&:hover': {
                    background: alpha(blue[100], 0.4)
                },
                '&:focus': {
                    background: alpha(blue[100], 0.8)
                }
            },
            colorError: {
                '&:hover': {
                    background: alpha(red[100], 0.4)
                },
                '&:focus': {
                    background: alpha(red[100], 0.8)
                }
            }
        }
    },
    MuiTab: {
        defaultProps: {
            disableRipple: false
        }
    },
    MuiAppBar: {
        styleOverrides: {
            root: {
                boxShadow: 'none',
                borderBottom: 'none'
            }
        }
    },
    MuiTableCell: {
        styleOverrides: {
            head: {
                fontWeight: 'bold',
                color: grey[800],
                borderBottom: `2px solid ${grey[200]}`,
            },
            root: {
                borderBottomColor: grey[200]
            }
        }
    },
    MuiStepIcon: {
        styleOverrides: {
            root: {
                '&.Mui-completed': {
                    color: alpha(blue[700], 0.8)
                }
            }
        }
    },
    MuiCard: {
        styleOverrides: {
            root: {
                boxShadow: '0px 1px 4px 0px rgba(0,0,0,0.1),0px 0px 1px 0px rgba(0,0,0,0.1)'
            }
        },
        variants: [
            {
                props: {
                    variant: 'outlined'
                },
                style: {
                    boxShadow: 'none'
                }
            }
        ]
    },
    MuiInputLabel: {
        styleOverrides: {
            root: {
                color: 'inherit'
            }
        }
    },
    MuiAlert: {
        styleOverrides: {
            standardWarning: {
                border: `1px solid #ffe1b8`
            },
            standardError: {
                border: `1px solid #fad9d9`
            },
            standardInfo: {
                border: `1px solid #c7e7f4`
            },
            standardSuccess: {
                border: `1px solid #cae8ca;`
            },
            // standard: {
            //     border: `1px solid ${grey[300]}`
            // }
        }
    }
}