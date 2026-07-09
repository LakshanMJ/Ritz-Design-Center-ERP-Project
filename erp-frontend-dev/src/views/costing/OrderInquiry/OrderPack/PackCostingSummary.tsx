import {Alert, Box, Button, Card, CardHeader, darken, Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from "@mui/material";
import React, {useEffect, useState} from "react";
import * as RestUrls from "@/helpers/constants/RestUrls";
import DefaultLoader from "@/components/DefaultLoader";
import {RitzTabs} from "@/components/Ritz/RitzTabs";
import RitzTable from "@/components/Ritz/RitzTable";
import api from "@/services/api";
import {ColumnDef} from "@tanstack/react-table";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import { costingValuesRecalculateURL } from "@/helpers/constants/rest_urls/CostingUrls";
import SaveSpinner from "@/components/SaveSpinner";


const OrderQuantitiesDisplay = ({orderId, versionId}: any) => {
    const tableCols: ColumnDef<any>[] = [
        {
            accessorKey: 'colorway',
            header: 'Colorway'
        },
        {
            accessorKey: 'country',
            header: 'Country'
        },
        {
            accessorKey: 'size',
            header: 'Size'
        },
        {
            accessorKey: 'normalized_cost', 
            header: 'Normalized Cost'
        },
    ];

    const packCostsUrl = RestUrls.versionPackCostsURL(orderId, versionId);

    const [isLoading, setIsLoading] = useState(false);
    const [packCostData, setPackCostData] = useState([]);
    const [averageCostData, setAverageCostData] = useState(null);
    const [isCalaculatingData, setIsCalaculatingData] = useState(false);
    const [costingRecalculateErrors, setCostingRecalculateErrors] = useState<any>({});
    useEffect(() => {
        if (orderId && versionId) {
            fetchCostingData();
        }
    }, [orderId, versionId]);

    const fetchCostingData = () => {
        setIsLoading(true);

        api.get(packCostsUrl, {redirectToErrorPage: true}).then((response) => {
            const responseData = response?.data || {};
            setPackCostData([...responseData.pack_costs]);
            setAverageCostData(responseData.average_cost)
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    const handleRecalculateCosting = () => {
        setCostingRecalculateErrors({})
        setIsCalaculatingData(true)
        const data = {
            calculate_type: 'all_colorways',
            colorway_id: null as any,
            pack_ids: [] as any
        }
        api.post(costingValuesRecalculateURL(versionId), data).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            fetchCostingData();
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            setCostingRecalculateErrors(error?.response?.data);
        }).finally(() => {
            setIsLoading(false);
            setIsCalaculatingData(false)
        });
    }

    return (
        <> 
           
        {isLoading ? <DefaultLoader/> :
                <>
                    <Box sx={{ mb: 1 }}>
                        {costingRecalculateErrors?.success === false && (
                            <Alert severity="error" >{costingRecalculateErrors?.message}</Alert>
                        )}
                    </Box>
                    <Box >
                        <Link component={'button'} onClick={() => { handleRecalculateCosting() }}>
                            <Button variant='outlined' sx={{ mb: 3, mr: 1 }} disabled={isCalaculatingData}>{isCalaculatingData && <SaveSpinner/>}Recalculate Costing</Button>
                        </Link>
                    </Box>
                    
                    <TableContainer component={Card} variant='outlined' sx={{ width: '25%' }}>
                        <Table size='small'>
                            <TableHead sx={{}}>
                                <TableRow>
                                    <TableCell>Average Cost</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell>{averageCostData || 'N/A'}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                    
                    <RitzTable columns={tableCols} data={packCostData} />
                </>
        }
        </>
    )
};

export default OrderQuantitiesDisplay;
