import {
    Table,
    TableContainer,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Card,
    Tooltip,
    Box, Typography, CardHeader, Grid
} from "@mui/material";
import {useEffect, useState} from "react";
import api from "@/services/api";
import {performCostingURL} from "@/helpers/constants/RestUrls";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import InfoIcon from '@mui/icons-material/Info';
import * as React from "react";
import {ORDER_MATERIAL_PACK_TYPE} from "@/helpers/constants/Constants";
import DefaultLoader from "@/components/DefaultLoader";


const PackOrPackItemCost = ({ versionId, objectId, objectType, costComponentRefresher, title }: any) => {
    const objectCostKey = 'cost';
    const normalizedCostKey = 'normalized_cost';

    const [refresherState, setRefresherState] = useState(0);
    const [objectCost, setObjectCost] = useState<any>(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        refreshObjectCost();
    }, [costComponentRefresher]);


    useEffect(() => {
        if (versionId && objectId && objectType) {
            refreshObjectCost();
        }
    }, [objectType, objectId, versionId]);


    const refreshObjectCost = () => {
        setIsLoading(true);
        api.get(performCostingURL(versionId, objectId, objectType)).then(resp => {
            const responseData = (resp?.data)
            setObjectCost(responseData);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    return (
        <Grid container columnSpacing={3} direction={'row'}>
            <Grid item md={12} xs={12} sx={{ width: '100%' }}>
                <Card sx={{ mb: 3 }} variant='outlined'>
                    <CardHeader
                        title={title}
                        sx={{
                            background: (theme) => theme.palette.grey[100],
                            borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`
                        }}
                    />
                    <>{isLoading ? <DefaultLoader /> : <>
                        <TableContainer component={Card} variant='outlined' sx={{}}>
                            <Table size='small'>
                                <TableHead sx={{}}>
                                    <TableRow>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                Cost
                                                {/*<Tooltip title='tooltip' sx={{ ml: 0.25 }}>*/}
                                                {/*    <InfoIcon fontSize='small' />*/}
                                                {/*</Tooltip>*/}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>{objectCost?.[objectCostKey] || 'N/A'}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>}</>
                    
                </Card>
            </Grid>
            <Grid item md={12} xs={12} sx={{ width: '100%' }}>
                <Card sx={{ mb: 3 }} variant='outlined'>
                    <CardHeader
                        title={'Financing and Buyer Commissions'}
                        sx={{
                            background: (theme) => theme.palette.grey[100],
                            borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`
                        }}
                    />     
                    <>{isLoading ? <DefaultLoader /> : <>
                        <TableContainer component={Card} variant='outlined' sx={{}}>
                            <Table size='small'>
                                <TableHead sx={{}}>
                                    <TableRow>
                                        <TableCell>Fabric Financing Costs</TableCell>
                                        <TableCell>Trim Financing Costs</TableCell>
                                        {objectType == ORDER_MATERIAL_PACK_TYPE && <TableCell>Buyer Commission Costs</TableCell>}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>{objectCost?.['cost_break_down']?.['fabric_financing_cost'] || 'N/A'}</TableCell>
                                        <TableCell>{objectCost?.['cost_break_down']?.['trim_financing_cost'] || 'N/A'}</TableCell>
                                        {objectType == ORDER_MATERIAL_PACK_TYPE && <TableCell>{objectCost?.['cost_break_down']?.['buyer_commission_cost'] || 'N/A'}</TableCell>}
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>}</>          
                </Card>
            </Grid>
         
        </Grid>
    );
};

export default PackOrPackItemCost;