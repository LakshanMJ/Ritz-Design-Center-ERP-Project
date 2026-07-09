import api from "@/services/api";
import {darken, Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from "@mui/material";
import React, { useEffect, useState } from "react";
import * as restUrls from "@/helpers/constants/RestUrls";
import { getCWQuantiMatrixEstimateQty, processEstimateQuantityMatrixAPIResponse } from "@/helpers/costings/QuantityMatrix";

const OrderQuantitiesDisplay = ({order, version}: any) => {
    const [cwEstimateQty, setCwEstimateQty] = useState({});
    const [cwCadQty, setCwCadQty] = useState({});
    const fetchData = () => {
        api.get(restUrls.orderPackEstimatedQuantitiesURL(version)).then(resp => {
            const estimateQtyData = resp.data;
            const estimateQuantities = processEstimateQuantityMatrixAPIResponse(estimateQtyData);
            setCwEstimateQty(estimateQuantities)
        }).catch(error => {
            //TO do
        }).finally(() => {

        });
    }

    const groupByCountryAndColorway = (ratios: any) => {
        const groupedQuantities = {};

        for (const key in ratios) {
            const [country, colorway] = key.split('_').slice(0, 2);
            const prefix = `${country}_${colorway}`;

            if (!groupedQuantities[prefix]) {
                groupedQuantities[prefix] = 0;
            }

            if (ratios[key] !== null) {
                groupedQuantities[prefix] += parseInt(ratios[key], 10);
            }
        }

        return groupedQuantities;
    };

    useEffect(() => {
        const groupedRatioQuantities = groupByCountryAndColorway(order?.quantities);
        const dividedQuantities = {};
        for (const key in groupedRatioQuantities) {
            if (groupedRatioQuantities[key] !== 0) {
                dividedQuantities[key] = cwEstimateQty[key] / groupedRatioQuantities[key];
            } else {
                dividedQuantities[key] = 0;
            }
        }

        const multipliedFinalqty = {};
        for (const key in order?.quantities) {
            const [country, colorway, size] = key.split('_');
            const prefix = `${country}_${colorway}`;

            if (dividedQuantities[prefix] !== 0) {
                const value = order?.quantities[key] !== null ? order?.quantities[key] * dividedQuantities[prefix] : null;
                multipliedFinalqty[key] = value !== null ? Math.round(value) : null;
            } else {
                multipliedFinalqty[key] = null;
            }
        }
        setCwCadQty({ ...multipliedFinalqty })

    }, [cwEstimateQty]);

    useEffect(() => {
        fetchData()
    }, [order]);

    return (
        <TableContainer>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell/>
                        <TableCell/>
                        <TableCell align='center' sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Estimate Qty</TableCell>
                        {order?.sizes?.map((size: any, index: number) => (
                            <TableCell key={index} align='center'
                                        sx={{borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`}}>{size.name}</TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {order?.countries?.map((country: any, index: number) => (
                        <React.Fragment key={`country-${index}`}>
                            {order?.colorways?.map((colorway: any, index: any) => (
                                <React.Fragment key={`s7b-${index}`}>
                                    <TableRow key={colorway.id + '_colorway_inputs_' + country.id}>
                                        {index == 0 ?
                                            <TableCell
                                                sx={{
                                                    borderTop: (theme) => `2px solid ${theme.palette.grey[200]}`,
                                                    borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                    fontWeight: 'bold',
                                                    px: 2,
                                                    background: (theme) => darken(theme.palette.grey[50], 0.01)
                                                }}
                                            >{country.name}</TableCell> : <TableCell/>}
                                        <TableCell
                                            sx={{
                                                fontWeight: 'bold',
                                                borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                borderTop: (theme) => `${index == 0 ? 2 : 1}px solid ${theme.palette.grey[200]}`,
                                                background: (theme) => theme.palette.grey[50]
                                            }}
                                        >{colorway.colorway}</TableCell>
                                        <TableCell
                            align='center'
                            sx={{
                                fontWeight: 'bold',
                                borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                borderTop: (theme) => `${index == 0 ? 2 : 1}px solid ${theme.palette.grey[200]}`,
                                background: (theme) => theme.palette.grey[50],
                                minWidth: '10rem'
                            }}
                        > 
                      {cwEstimateQty?.[getCWQuantiMatrixEstimateQty(country.id, colorway.id)]}
                        </TableCell>
                                        {
                                            order?.sizes.map((size: any, i: number) => (
                                                <TableCell
                                                    key={colorway.id + "_" + size.id + "_colorwaysize_" + country.id}
                                                    align='center'
                                                    sx={{
                                                        borderTop: (theme) => `${index == 0 ? 2 : 1}px solid ${theme.palette.grey[200]}`,
                                                        borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                        background: (theme) => theme.palette.grey[50]
                                                    }}
                                                >
                                                    {order?.quantities?.[country.id + "_" + colorway.id + "_" + size.id] || ''}
                                                </TableCell>
                                                
                                            ))
                                        }
                                    </TableRow>
                                    
                                    {order?.items?.map((item: any, index: number) => (
                                        <TableRow
                                            key={colorway.id + "_" + "_" + item.id + "_itemparent_" + country.id}
                                            sx={{
                                                '&:last-child td, &:last-child th': {
                                                    borderBottom: 0
                                                }
                                            }}
                                        >
                                            
                                            <TableCell
                                                sx={{borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`}}></TableCell>
                                            <TableCell
                                                sx={{borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`}}>{item.name}</TableCell>
                                                  <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}></TableCell>
                                            {order?.sizes.map((size: any, index: number) => (
                                                <TableCell
                                                    key={colorway.id + "_" + size.id + "_" + item.id + "_itemchild_" + country.id}
                                                    align='center'
                                                    sx={{
                                                        borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`
                                                    }}
                                                >
                                                    {cwCadQty?.[country.id + "_" + colorway.id + "_" + size.id] || ''}
                                                </TableCell>
                                            ))}
                                            
                                        </TableRow>
                                    ))}
                                </React.Fragment>
                            ))}
                        </React.Fragment>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
};

export default OrderQuantitiesDisplay;
