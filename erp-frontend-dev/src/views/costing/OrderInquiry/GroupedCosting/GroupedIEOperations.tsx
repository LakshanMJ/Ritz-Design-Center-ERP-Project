import React, {useEffect, useRef, useState} from 'react';
import api from "@/services/api";
import * as restUrls from "@/helpers/constants/RestUrls";
import { getDefaultError } from '@/helpers/Utilities';
import { toast } from 'react-hot-toast';
import {ColumnDef} from "@tanstack/react-table";
import DefaultLoader from "@/components/DefaultLoader";
import RitzTable from "@/components/Ritz/RitzTable";
import {
    Box,
    Card,
    CardHeader,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from "@mui/material";
import {ReactKeyHelper} from "@/helpers/KeyHelper";
import {getOrderPackItemColorwayOperationsURL} from "@/helpers/constants/RestUrls";


const GroupedPackItemsOperations = ({ versionId, orderItemId, colorwayId, sizeGroupId, countryId, sizeHeaders }: any) => {
    const operationsKey = 'operations';
    const operationNameKey = 'operation_name';
    const factorySMVKey = 'factory_smv';
    const costingSMVKey = 'costing_smv';
    const earningsPerMinuteKey = 'earnings_per_minute';
    const operationCostKey = 'operation_cost';
    const sizeNameKey = 'size_name';

    const [isLoading, setIsLoading] = useState(true);
    const [itemCWOperations, setItemCWOperations] = useState([]);

    const keyHelper = new ReactKeyHelper();
    const fetchData = () => {
        // Get all data needed for this page and summary component
        const requests = [
            api.get(restUrls.getSizeGroupOrderPackItemColorwayOperationsURL(countryId, colorwayId,  sizeGroupId, orderItemId, versionId)),
        ]

        Promise.all(requests).then(resp => {
            const respData = resp.map(r => r.data);
            const [colorwayOperations] = respData;
            const operationsList = colorwayOperations;
            setItemCWOperations([...operationsList]);

        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    useEffect(() => {
        if (versionId && orderItemId && colorwayId && sizeGroupId && countryId) {
            fetchData()
        }
    }, [versionId, orderItemId, colorwayId, sizeGroupId, countryId]);

    return (
        <>
            {isLoading ? <DefaultLoader/> :
                <Grid container columnSpacing={3} direction={'row'} key={keyHelper.getNextKeyValue()}>
                    <Grid item md={12} xs={12} sx={{width: '100%'}}>
                        <Card key={`${keyHelper.getNextKeyValue()}`} sx={{mb: 3}} variant='outlined'>
                            <CardHeader
                                title={`IE Operations`}
                                sx={{
                                    background: (theme) => theme.palette.grey[100],
                                    borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`
                                }}
                            />
                            <TableContainer component={Card}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>
                                                Size
                                            </TableCell>
                                            <TableCell>
                                                Operation Names
                                            </TableCell>
                                            <TableCell>
                                                EPM
                                            </TableCell>
                                            <TableCell>
                                                Total Cost
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {
                                            itemCWOperations.map((itemCwOperation: any, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{itemCwOperation?.[sizeNameKey]}</TableCell>
                                                    <TableCell>{itemCwOperation?.[operationNameKey]}</TableCell>
                                                    <TableCell>{itemCwOperation?.[earningsPerMinuteKey]}</TableCell>
                                                    <TableCell>{itemCwOperation?.[operationCostKey]}</TableCell>
                                                </TableRow>
                                            ))
                                        }
                                        {
                                            itemCWOperations.length == 0 &&
                                                <TableRow>
                                                    <TableCell colSpan={3}>There are no operations defined.</TableCell>
                                                </TableRow>
                                        }

                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Card>
                    </Grid>
                </Grid>

            }

        </>
    );
};

export default GroupedPackItemsOperations;