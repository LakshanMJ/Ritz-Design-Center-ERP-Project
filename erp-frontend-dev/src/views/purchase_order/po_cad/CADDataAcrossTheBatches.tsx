import RitzInput from "@/components/Ritz/RitzInput";
import RitzModal from "@/components/Ritz/RitzModal";
import RitzQR from "@/components/Ritz/RitzQR";
import { Box, Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { batch } from "react-redux";
import * as POUrls from '@/helpers/constants/rest_urls/POUrls';
import { getDefaultError } from "@/helpers/Utilities";
import api from "@/services/api";
import toast from "react-hot-toast";

const CADTable2 = ({ clubId }: any) => {

    const [isLoading, setIsLoading] = useState(true)
    const [showBarcodeDetails, setShowBarcodeDetails] = useState(false);
    const [selectedBarcode,setSelectedBarcode] = useState(0);
    const [data, setData] = useState([]);
    const [uniqueWidthCategories, setUniqueWidthCategories] = useState([]);
    const [clickedCell, setClickedCell] = useState({row:null, column:null});
    
    const handleBarcodeOnClick = (openState: boolean, barcode:any) => {
        setShowBarcodeDetails(openState);
        setSelectedBarcode(barcode);
    }

    const fetchData = () => {
        api.get(POUrls.cadPurchaseOrderAllocatedMaterialListDeliveryDate(clubId))
            .then(resp => {
                const responseData = resp?.data || [];
                setData([...responseData]);
                if (responseData.length > 0) {
                    setUniqueWidthCategories([...responseData[0].unique_widths])
                }
               
            })
            .catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => setIsLoading(false))
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCellClick = (row:any,column:any) => {
        if (clickedCell.row === row && clickedCell.column === column){
            setClickedCell({row:null, column:null});
        }else{
            setClickedCell({row, column});
        }
    };
    
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
       
        {data.map(delivery => (
            <Box>
            <Box sx={{ paddingTop: '20px', paddingBottom: '30px'}}>
               <Typography sx={{ fontWeight: 'bold' }}>{delivery.delivery_name}</Typography>
            </Box>
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
                        <TableCell rowSpan={2} sx={{textAlign: 'center', verticalAlign: 'middle', border: '1px solid #D3D3D9'}}>Shade Group</TableCell>
                        <TableCell colSpan={uniqueWidthCategories.length} sx={{textAlign: 'center', verticalAlign: 'middle', border: '1px solid #D3D3D9'}}>Width Category</TableCell>
                    </TableRow>
                    <TableRow
                        sx={{
                            '&:nth-of-type(even)': {
                              backgroundColor: (theme) => theme.palette.grey[100],
                            },
                            '&:last-child td, &:last-child th': {
                              borderBottom: 0
                            }
                          }}>
                        {uniqueWidthCategories.map((category, index) => (
                            <TableCell key={index} sx={{textAlign: 'center', verticalAlign: 'middle', border: '1px solid #D3D3D9'}}>{category.width}</TableCell>
                        ))}
                    </TableRow> 
                </TableHead>
                <TableBody>
             { delivery.shade_groups.map((shade:any,rowIndex:any) => (
                                    <React.Fragment>
                                            <TableRow sx={{ height: '80px' }} key={rowIndex}>
                                                <TableCell
                                                    sx={{border: '1px solid #D3D3D9'}}>
                                                    {shade.shade_group}
                                                </TableCell>
                                                {uniqueWidthCategories.map((category: any, columnIndex: any) => {
                                                    const rolls = shade.widths.find((width: any) => width.id === category.id)?.rolls;
                                                    return (
                                                        <TableCell key={columnIndex}
                                                            sx={{
                                                                border: '1px solid #D3D3D9',
                                                                width: `${50 / uniqueWidthCategories.length}%`,
                                                                boxSizing: 'border-box',
                                                                cursor: 'pointer',
                                                                textAlign: 'center'
                                                            }}
                                                            onClick={() => handleCellClick(rowIndex, columnIndex)}>

                                                            {rolls && rolls.map((roll: any, rollIndex: any) => (
                                                                <Link
                                                                    key={rollIndex}
                                                                    sx={{ cursor: 'pointer' }}
                                                                    target="_blank"
                                                                    onClick={() => handleBarcodeOnClick(true, roll)}>
                                                                    {rollIndex > 0 ? `, ${roll}` : roll}
                                                                </Link>
                                                            ))}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                            <TableRow sx={{height: '20px'}}>
                                                <TableCell
                                                    sx={{
                                                        border: '1px solid #D3D3D9'
                                                        }}>
                                                    Quantity {'(m)'}</TableCell>
                                                {uniqueWidthCategories.map((category,index) => 
                                                <TableCell sx={{ border: '1px solid #D3D3D9', width: `${70 / uniqueWidthCategories.length}%`,boxSizing: 'border-box',textAlign: 'center' }} key={index}>
                                               {shade.widths.find((width: any) => width.id === category.id)?.qty}
                                              </TableCell>
                                                )}
                                            </TableRow>
                                            </React.Fragment>
                                ))
                            }      
                </TableBody>
            </Table>
        </TableContainer>
        </Box>
        ))}
         </>
    );
};

export default CADTable2;