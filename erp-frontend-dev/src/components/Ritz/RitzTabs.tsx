import { TabPanel } from '@mui/lab';
import { Box, Card, Tab, Tabs, useMediaQuery, useTheme } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

export const RitzTabs = ({
    tabs=[],
    activeTab='1',
    emitChange,
    disabled=false
}: any) => {
    const [activeId, setActiveId] = useState(activeTab || '1');
    const tabRef = useRef(null);
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down('md'));
    const selectedTheme = theme?.['name'];
    const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');

    const handleOnChange = (event: React.SyntheticEvent, value: string) => {
        setActiveId(value);
        emitChange(value);
    }

    const handleResize = () => {
        if (tabRef.current) {
            const tabs = [...tabRef.current.getElementsByClassName('tab-child')];
            const widths = tabs.map((t: any) => t.clientWidth);
            const tabWidth = widths.reduce((a, b) => a + b) + (tabs.length * 10); //tabRef.current.scrollWidth;

            const container = document.getElementById('main-container');
            const containerWidth = container.clientWidth - (32 * 2); // account for side padding

            const exceeds = tabWidth > containerWidth;

            setOrientation(exceeds || isSmall ? 'vertical' : 'horizontal');
        }
    }

    useEffect(() => {
        handleResize();
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(tabRef.current);
    }, []);
    
    useEffect(() => {
       setActiveId(activeTab);
    }, [activeTab]);

    return (
        <Tabs
            orientation={orientation}
            value={activeId} 
            onChange={handleOnChange} 
            ref={tabRef}
            sx={{
                flexGrow: 1,
                overflow: 'visible!important',
                '& div.MuiTabs-scroller': {
                    overflow: 'visible!important'
                },
                '& .MuiTabs-indicator': {
                    display: 'none'
                },
                '& .MuiTabs-flexContainer': {
                  flexWrap: 'wrap',
                },
                pb: orientation === 'vertical' ? 2 : 0,
                ...(selectedTheme === 'theme1' ? {
                    borderImage: (theme) => `linear-gradient(to right, transparent 0% 5%, ${theme.palette.grey[200]} 5% 95%, transparent 95%)`,
                    borderImageSlice: 1,
                    borderBottom: (theme) => `1px solid ${theme.palette.grey[50]}`,
                } : {
                    borderBottom: (theme) => `1px solid ${theme.palette.mainBorder}`,
                })
            }}
        >
            {tabs.map((tab: any, i: number) => 
                <Tab 
                    className='tab-child'
                    key={i}
                    label={tab}
                    value={(i + 1).toString()}
                    disabled={disabled}
                    disableRipple
                    sx={{
                        fontWeight: theme.typography.fontWeightMedium,
                        marginRight: theme.spacing(1),
                        width: 'fit-content',
                        minWidth: 'auto',
                        background: '0 0',
                        ...(orientation === 'horizontal' ? {
                            ...(selectedTheme === 'theme1' ? {
                                borderTop: '1px solid rgba(0, 0, 0, 0.1)',
                                borderLeft: i === 0 ? 0 : '1px solid rgba(0, 0, 0, 0.1)',
                                borderRight: '1px solid rgba(0, 0, 0, 0.1)',
                                position: 'relative',
                                zIndex: 5,
                                ...(i === 0 && {
                                    // '::before': {
                                    //     content: '""',
                                    //     position: 'absolute',
                                    //     width: '100%',
                                    //     height: '100%',
                                    //     top: 0,
                                    //     boxShadow: '-4px 0 4px rgba(0,0,0,0.1)'
                                    // },
                                    boxShadow: '-4px 1px 4px -3px rgba(0,0,0,0.1)'
                                })
                            } : {
                                borderTop: '1px solid rgba(0, 0, 0, 0.1)',
                                borderLeft: '1px solid rgba(0, 0, 0, 0.1)',
                                borderRight: '1px solid rgba(0, 0, 0, 0.1)',
                            }),
                            borderTopLeftRadius: theme.shape.borderRadius,
                            borderTopRightRadius: theme.shape.borderRadius,
                            marginBottom: '-1px',
                            '&.Mui-selected': {
                                background: '#fff',
                                fontWeight: theme.typography.fontWeightMedium,
                                color: '#000',
                                borderColor: `${theme.palette.mainBorder} ${theme.palette.mainBorder} #fff`,
                                '&:hover': {
                                    borderColor: `${theme.palette.mainBorder} ${theme.palette.mainBorder} #fff`,
                                    boxShadow: (selectedTheme === 'theme1' && i === 0) ? '-4px 1px 4px -3px rgba(0,0,0,0.1)' : 0
                                }
                            },
                            '&:hover': {
                                color: theme.palette.grey[1000],
                                // borderTop: `1px solid ${theme.palette.mainBorder}`,
                                // borderLeft: `1px solid ${theme.palette.mainBorder}`,
                                // borderRight: `1px solid ${theme.palette.mainBorder}`,
                                borderColor: theme.palette.grey[400],
                                ...((selectedTheme === 'theme1' && i === 0) && {
                                    boxShadow: '-2px 1px 1px 0px rgba(0,0,0,0.1)'
                                })
                            }
                        } : {
                            '&.Mui-selected': {
                                fontWeight: theme.typography.fontWeightMedium,
                                borderLeft: `2px solid ${theme.palette.primary.main}`
                            },
                            '&:hover': {
                                color: theme.palette.primary.main,
                            }
                        })
                    }}
                />
            )}
        </Tabs>
    )
}

export const RitzTabPanel = (props: any) => {
    const { sx = {}, value, children } = props;
    const selectedTheme = useTheme()?.['name'];

    return (
        <TabPanel
            value={value}
            sx={{
                p: 0,
                background: '#fff',
                ...(selectedTheme === 'theme1' ? {
                    zIndex: 10,
                    position: 'relative',
                    // borderTopRightRadius: (theme) => theme.shape.borderRadius,
                    // borderBottomLeftRadius: (theme) => theme.shape.borderRadius,
                    // borderBottomRightRadius: (theme) => theme.shape.borderRadius,
                    borderRadius: (theme) => theme.shape.borderRadius
                } : {
                    borderRight: (theme) => `1px solid ${theme.palette.mainBorder}`,
                    borderLeft: (theme) => `1px solid ${theme.palette.mainBorder}`,
                    borderBottom: (theme) => `1px solid ${theme.palette.mainBorder}`,
                })
            }}
        >
            {selectedTheme === 'theme1' ? (
                <Card variant='elevation' sx={{ p: 3, borderTopLeftRadius: 0, ...sx }}>{children}</Card>
            ) : (
                <Box sx={{ p: 3, ...sx }}>{children}</Box>
            )}
        </TabPanel>
    )
}
