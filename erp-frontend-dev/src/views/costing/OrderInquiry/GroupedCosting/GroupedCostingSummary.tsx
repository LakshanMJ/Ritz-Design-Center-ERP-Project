import {
    Table,
    TableContainer,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Card, Grid, CardHeader, Typography, Box,
} from "@mui/material";
import {useEffect, useState} from "react";
import api from "@/services/api";
import * as costingRestUrls from "@/helpers/constants/rest_urls/CostingUrls";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import * as React from "react";
import DefaultLoader from "@/components/DefaultLoader";


const GroupedSizeCosting = ({ versionId, countryId, colorwayId, sizeGroupId, costComponentRefresher }: any) => {

    const [objectCost, setObjectCost] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        refreshObjectCost();
    }, [costComponentRefresher]);


    useEffect(() => {
        if (versionId && countryId && colorwayId && sizeGroupId) {
            refreshObjectCost();
        }
    }, [versionId, countryId, colorwayId, sizeGroupId]);


    const refreshObjectCost = () => {
        setIsLoading(true);
        api.get(costingRestUrls.performColorwayCountrySizeGroupCostingURL(versionId, countryId, colorwayId, sizeGroupId)).then(resp => {
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
                <Box>
                    <Typography variant="h1" component="h2">Pack Cost Summary</Typography>
                </Box>
                <Grid item md={12} xs={12} sx={{ width: '100%' }}>
                    <Card sx={{ mb: 3 }} variant='outlined'>
                        <CardHeader
                            title={'Cost Summary'}
                            sx={{
                                background: (theme) => theme.palette.grey[100],
                                borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`
                            }}
                        />
                        {isLoading ? <DefaultLoader /> : (
                            <TableContainer component={Card} variant='outlined' >
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            {
                                                objectCost.map((cost: any, index: number) => (
                                                    <TableCell key={`cost-header-${index}`}>
                                                        {`${cost?.size} Pack Cost`}
                                                    </TableCell>

                                                ))
                                            }
                                            <TableCell>Size Group Normalized Cost</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        <TableRow>
                                            {
                                                objectCost.map((cost: any, index: number) => (
                                                    <TableCell key={`cost-header-${index}`}>
                                                        {`${cost?.cost?.pack_total_cost || "N/A"}`}

                                                    </TableCell>

                                                ))
                                            }
                                            <TableCell>{`${objectCost[0]?.normalized_cost?.normalized_costs || "N/A"}`}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Card>
                </Grid>
                <Card sx={{ mb: 3 }} variant='outlined'>
                    <CardHeader
                        title={'Financing Cost Summary'}
                        sx={{
                            background: (theme) => theme.palette.grey[100],
                            borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`
                        }}
                    />
                    {isLoading ? <DefaultLoader /> : (
                     <TableContainer component={Card}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell></TableCell>
                                    {
                                        objectCost.map((cost: any, index: number) => (
                                            <TableCell key={`cost-header-${index}`}>
                                                {`${cost?.size} Pack Cost`}
                                            </TableCell>

                                        ))
                                    }
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell>Fabric Financing Cost</TableCell>
                                    {
                                        objectCost.map((cost: any, index: number) => (
                                            <TableCell key={`cost-header-${index}`}>
                                                {`${cost?.cost?.fabric_financing_cost || "N/A"}`}

                                            </TableCell>

                                        ))
                                    }
                                </TableRow>
                                <TableRow>
                                    <TableCell>Trim Financing Cost</TableCell>
                                    {
                                        objectCost.map((cost: any, index: number) => (
                                            <TableCell key={`cost-header-${index}`}>
                                                {`${cost?.cost?.trim_financing_cost || "N/A"}`}
                                            </TableCell>

                                        ))
                                    }
                                </TableRow>
                                <TableRow>
                                    <TableCell>Buyer Commission Cost</TableCell>
                                    {
                                        objectCost.map((cost: any, index: number) => (
                                            <TableCell key={`cost-header-${index}`}>
                                                {`${cost?.cost?.buyer_commission_cost || "N/A"}`}
                                            </TableCell>
                                        ))
                                    }
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                     )}
                 </Card>
             </Grid>
        </Grid>
    );
};

export default GroupedSizeCosting;
