import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, Typography, Box, Grid, List, ListItem, ListItemButton, ListItemText, Divider, Alert, IconButton, Tooltip, Button, Link } from '@mui/material';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import DefaultLoader from '@/components/DefaultLoader';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import RitzSelection from '@/components/Ritz/RitzSelection';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import SearchIcon from '@mui/icons-material/Search';
import CircularLoader from '@/components/CircularLoader';
import DoneIcon from '@mui/icons-material/Done';
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import MenuIcon from "@mui/icons-material/Menu";
import { useRouter } from 'next/router';
import SpeedConsumptionDetails from './SpeedConsumptionDetails';
import { pendingSpeedConsumptionListURL } from '@/helpers/constants/rest_urls/CostingUrls';

const SpeedConsumptionList = () => {
    const router = useRouter();
    const prevPoClub = useRef<string | null>(null);
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true)
    const [selectedCostingId, setSelectedCostingId] = useState<any>(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const [backgroundColor, setBackgroundColor] = useState("white");
    const [isScrollLoading, setIsScrollLoading] = useState(false)
    const [SpeedConsumptionList, setSpeedConsumptionList] = useState<any>({});

    const fetchData = () => {
        const requests = [
            api.get(pendingSpeedConsumptionListURL()),
        ]
        Promise.all(requests).then(response => {
            const [pendingList] = response.map((r: any) => r.data);
            setSpeedConsumptionList({ ...pendingList })
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }
    const handlePoClubClick = (costing: any) => {
        setSelectedCostingId(costing.id);
        const url = {
            pathname: router.pathname,
            query: { ...router.query, costing: costing.id }
        }
        router.replace(url, undefined, { shallow: true });
    };

    useEffect(() => {
        const { costing } = router.query;
        if (costing && costing !== prevPoClub.current) {
            setSelectedCostingId(parseInt(costing.toString()));
            prevPoClub.current = costing.toString();
        }
    }, [router]);

    useEffect(() => {
        fetchData()
    }, [])

    return (
        <>
            {isLoading ? <DefaultLoader /> : (
                <>
                    <Box>
                        <Typography variant='h1' color='text.primary' sx={{ mt: 2 }}>Speed Consumptions</Typography>
                    </Box>
                    <Box>
                        <Alert severity="warning">{SpeedConsumptionList?.count} speed consumption inquiries are pending.</Alert>
                    </Box>
                    <Tooltip title={isMinimized ? 'Expand' : 'Collapse'} placement='right'>
                        <IconButton
                            onClick={() => setIsMinimized(!isMinimized)}
                            sx={{
                                fontSize: '1rem',
                                mb: 1,
                                borderRadius: 1
                            }}
                        >
                            {!isMinimized ? <MenuOpenIcon fontSize='inherit' /> : <MenuIcon fontSize='inherit' />}
                            <span style={{ marginLeft: 4, fontSize: 'smaller' }}>Costings</span>
                        </IconButton>
                    </Tooltip>
                    <Grid
                        container direction="row"
                        sx={{ height: '100vh', display: 'flex' }}>
                        {!isMinimized && (
                            <Grid
                                item
                                xs={12}
                                md={2}
                                sx={{
                                    backgroundColor: '#f5f5f5',
                                    borderRight: '1px solid #ddd',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '100%',
                                }}
                            >
                                <Card sx={{ flex: 1, boxShadow: 'none', borderRadius: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    <CardContent
                                        sx={{
                                            flex: 1,
                                            overflowY: 'auto',
                                            padding: 2,
                                            backgroundColor: backgroundColor,
                                            transition: "background-color 0.5s ease",
                                        }}
                                        onScroll={(e) => { }}
                                    >
                                        <Box>
                                            {(Object.entries(SpeedConsumptionList?.customer_data || {}) as [string, any[]][]).map(([customerName, costings]) => (
                                                <Box key={`${keyHelper.getNextKeyValue()}`} marginBottom={2}>
                                                    <Typography fontSize="20px" fontWeight="bold" variant="subtitle1" color="primary">
                                                        {customerName}
                                                    </Typography>

                                                    <Box marginTop={1}>
                                                        <List dense>
                                                            {costings.length === 0 ? (
                                                                <ListItem>
                                                                    <ListItemText primary="No available Costings." />
                                                                </ListItem>
                                                            ) : (
                                                                costings.map((costing: any) => (
                                                                    <ListItem
                                                                        key={`${keyHelper.getNextKeyValue()}`}
                                                                        disablePadding
                                                                        selected={selectedCostingId === costing.id}
                                                                    >
                                                                        <ListItemButton onClick={() => handlePoClubClick(costing)}>
                                                                            <ListItemText
                                                                                primary={
                                                                                    <Box display="flex" alignItems="center" justifyContent="space-between">
                                                                                        <Box display="flex" alignItems="center">
                                                                                            <Typography
                                                                                                color={selectedCostingId === costing.id ? 'primary' : 'inherit'}
                                                                                                fontWeight={selectedCostingId === costing.id ? 'bold' : 'normal'}
                                                                                            >
                                                                                                {costing?.short_code}
                                                                                            </Typography>
                                                                                            {costing?.is_create_supplier_pos && <DoneIcon sx={{ color: '#059212', ml: 3 }} />}
                                                                                        </Box>
                                                                                    </Box>
                                                                                }
                                                                                primaryTypographyProps={{
                                                                                    color: selectedCostingId === costing.id ? 'primary' : 'inherit',
                                                                                    fontWeight: selectedCostingId === costing.id ? 'bold' : 'normal',
                                                                                }}
                                                                            />
                                                                        </ListItemButton>
                                                                    </ListItem>
                                                                ))
                                                            )}
                                                        </List>
                                                        <Divider />
                                                    </Box>
                                                </Box>
                                            ))}
                                        </Box>
                                        {isScrollLoading && (
                                            <Box display="flex" justifyContent="center" padding={2}>
                                                <DefaultLoader />
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}
                        <Grid item
                            xs={12}
                            md={isMinimized ? 12 : 10}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                            }}>
                            <Card sx={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                overflowY: 'auto'
                            }}>
                                <CardContent>
                                    {selectedCostingId ? (
                                        <Box>
                                            <SpeedConsumptionDetails costingId={selectedCostingId} refreshData={() => { fetchData() }} />
                                        </Box>
                                    ) : (
                                        <Alert severity="info">Click on a Costing to view details.</Alert>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </>
            )}
        </>
    );
}

export default SpeedConsumptionList;