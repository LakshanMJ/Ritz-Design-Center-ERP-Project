import RitzInput from "@/components/Ritz/RitzInput";
import RitzModal from "@/components/Ritz/RitzModal";
import RitzQR from "@/components/Ritz/RitzQR";
import api from "@/services/api";
import { Box, Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { batch } from "react-redux";
import * as POUrls from '@/helpers/constants/rest_urls/POUrls';
import { getDefaultError } from "@/helpers/Utilities";
import toast from "react-hot-toast";

const CADTable = ({ clubId }: any) => {

    const [isLoading, setIsLoading] = useState(true)
    const [showBarcodeDetails, setShowBarcodeDetails] = useState(false);
    const [selectedBarcode, setSelectedBarcode] = useState(0);
    const [data, setData] = useState([]);
    const [clickedCell, setClickedCell] = useState({row:null, column:null});

    const handleBarcodeOnClick = (openState: boolean, barcode: any) => {
        setShowBarcodeDetails(openState);
        setSelectedBarcode(barcode);
    }

    const fetchData = () => {
        api.get(POUrls.cadPOAllocatedMaterialListURL(clubId))
            .then(resp => {
                const responseData = resp?.data || [];
                setData(responseData);
            })
            .catch(error => {
                console.log(error)
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => setIsLoading(false))
    };

    useEffect(() => {
        fetchData();
    }, []);

    const uniqueWidthCategories: string[] = [];
    data.forEach(material => {
        material.deliveries.forEach((delivery:any) => {
            delivery.batch_numbers.forEach((batch:any) => {
                batch.shade_groups.forEach((shade:any) => {
                    shade.widths.forEach((widthCategory:any) => {
                        if (!uniqueWidthCategories.includes(widthCategory.width)) {
                            uniqueWidthCategories.push(widthCategory.width);
                        }
                    });
                });
            });
        });
    });

    

    const handleCellClick = (row:any,column:any) => {
        if (clickedCell.row === row && clickedCell.column === column){
            setClickedCell({row:null, column:null});
        }else{
            setClickedCell({row, column});
        }
    };

    const uniqueMaterialNames: string[] = [];
    const uniqueDeliveryDates: any[] = [];
    const uniqueBatchNumbers: string[] = [];

    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow
                        sx={{
                            '&:nth-of-type(odd)': {
                                backgroundColor: (theme) => theme.palette.grey[100],
                            },
                            '&:last-child td, &:last-child th': {
                                borderBottom: 0
                            }
                        }}>
                        <TableCell rowSpan={2}
                            sx={{
                                borderTop: '1px solid #D3D3D9',
                                borderBottom: '1px solid #D3D3D9',
                                borderRight: 'none',
                                borderLeft: '1px solid #D3D3D9',
                                textAlign: 'center',
                                verticalAlign: 'middle'
                            }}>
                            Color</TableCell>
                        <TableCell rowSpan={2}
                            sx={{
                                borderTop: '1px solid #D3D3D9',
                                borderBottom: '1px solid #D3D3D9',
                                borderRight: 'none',
                                borderLeft: '1px solid #D3D3D9',
                                textAlign: 'center',
                                verticalAlign: 'middle'
                            }}>
                            Delivery</TableCell>
                        <TableCell rowSpan={2}
                            sx={{
                                borderTop: '1px solid #D3D3D9',
                                borderBottom: '1px solid #D3D3D9',
                                borderRight: 'none',
                                borderLeft: '1px solid #D3D3D9',
                                textAlign: 'center',
                                verticalAlign: 'middle'
                            }}>
                            Batch Number</TableCell>
                        <TableCell rowSpan={2}
                            sx={{
                                borderTop: '1px solid #D3D3D9',
                                borderBottom: '1px solid #D3D3D9',
                                borderRight: '1px solid #D3D3D9',
                                borderLeft: '1px solid #D3D3D9',
                                textAlign: 'center',
                                verticalAlign: 'middle'
                            }}>
                            Shade Group</TableCell>
                        <TableCell colSpan={uniqueWidthCategories.length} sx={{ textAlign: 'center', verticalAlign: 'middle', borderTop: '1px solid #D3D3D9',borderRight: '1px solid #D3D3D9', borderBottom: '1px solid #D3D3D9',}}>Width Category</TableCell>
                    </TableRow>
                    <TableRow
                        sx={{
                            '&:nth-of-type(even )': {
                                backgroundColor: (theme) => theme.palette.grey[100],
                            },
                            '&:last-child td, &:last-child th': {
                                borderBottom: 0
                            }
                        }}>
                        {uniqueWidthCategories.map((category, index) => (
                            <TableCell key={index} sx={{ textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid #D3D3D9', }}>{category}</TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                {data.map((material, rowIndex) => (
                    material.deliveries.map((delivery:any) => (
                        delivery.batch_numbers.map((batch:any) => (
                            batch.shade_groups.map((shade:any) => (
                                shade.widths.map((width_category:any) => {
                                    const materialIndex = uniqueMaterialNames.indexOf(material.material_name);
                                    const isFirstMaterial = materialIndex === -1;

                                    const deliveryDateIndex = uniqueDeliveryDates.findIndex(entry => entry.material === material.material_name && entry.date === delivery.delivery_date);
                                    const isFirstDeliveryDate = deliveryDateIndex === -1;

                                    const batchNumberIndex = uniqueBatchNumbers.indexOf(batch.batch_number);
                                    const isFirstBatchNumber = batchNumberIndex === -1;

                                    if (isFirstMaterial) {
                                        uniqueMaterialNames.push(material.material_name);
                                    }

                                    if (isFirstMaterial || isFirstDeliveryDate) {
                                        uniqueDeliveryDates.push({ material: material.material_name, date: delivery.delivery_date });
                                    }

                                    if (isFirstBatchNumber) {
                                        uniqueBatchNumbers.push(batch.batch_number);
                                    }

                                    return (
                                        <>
                                        { showBarcodeDetails &&
                                            <RitzModal open={showBarcodeDetails} title={''} onClose={() => setShowBarcodeDetails(false)} maxWidth='xs'>
                                                <Box sx={{m:2 , display:'flex', flexDirection:'row', justifyContent: 'center'}}>
                                                    <Box sx={{width:'150px', Height:'90px'}}>
                                                            <RitzQR value={selectedBarcode} size={150}/>
                                                    </Box>
                                                    <Box sx={{ml:2}}>
                                                    </Box>
                                                </Box>
                                            </RitzModal>
                                        }

                                        
                                        <TableRow key={rowIndex}>
                                            <TableCell
                                                sx={{
                                                    borderTop: isFirstMaterial ? '1px solid #D3D3D9' : 'none',
                                                    borderBottom: '1px solid #D3D3D9', 
                                                    borderRight: '1px solid #D3D3D9',
                                                    borderLeft: '2px solid #D3D3D9'}}>
                                                {isFirstMaterial && material.material_name}
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    borderTop: isFirstDeliveryDate ? '1px solid #D3D3D9' : 'none',
                                                    borderBottom: '1px solid #D3D3D9',
                                                    borderRight: '1px solid #D3D3D9',
                                                    borderLeft: '1px solid #D3D3D9'}}>
                                                {isFirstDeliveryDate && delivery.delivery_date}
                                            </TableCell>
                                            <TableCell
                                                sx={{
                                                    borderTop: isFirstBatchNumber ? '1px solid #D3D3D9' : 'none',
                                                    borderBottom: '1px solid #D3D3D9',
                                                    borderRight: '1px solid #D3D3D9',
                                                    borderLeft: '1px solid #D3D3D9'}}>
                                                {batch.batch_number}
                                            </TableCell>
                                            <TableCell sx={{ border: '1px solid #D3D3D9' }}>{shade.shade_group}</TableCell>

                                            {uniqueWidthCategories.map((category,columnIndex) => (
                                                <TableCell key={columnIndex} 
                                                           sx={{ border: '1px solid #D3D3D9', width: `${50 / uniqueWidthCategories.length}%`, boxSizing: 'border-box', textAlign: 'center',
                                                                 verticalAlign: 'middle',cursor: 'pointer' }}
                                                           onClick={() => handleCellClick(rowIndex,columnIndex)} >
                                                    {width_category.width === category && width_category.rolls.map((roll:any, rollKey:any) => (
                                                        <React.Fragment key={rollKey}>
                                                        <Link
                                                            sx={{cursor: 'pointer'}}
                                                            target="_blank"
                                                            onClick={() =>  handleBarcodeOnClick(true,roll)}
                                                            >
                                                            {roll}
                                                        </Link>
                                                        {rollKey !== width_category.rolls.length - 1 && ', '}
                                                    </React.Fragment>
                                                    ))}
                                                </TableCell>
                                            ))}

                                        </TableRow>


                                        </>
                                    );
                                })
                            ))
                        ))
                    ))
                ))}

                </TableBody>

            </Table>
        </TableContainer>
    );
};

export default CADTable;