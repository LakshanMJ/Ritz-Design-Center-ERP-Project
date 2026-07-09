import RitzInput from '@/components/Ritz/RitzInput';
import { Box, Button, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import React, { useState, useEffect } from 'react';

const LeftOverEditTable = ({savingData,handleAvailableQuantityChange}:any) => {
  
  return (
    <Table sx={{
        border: '2px solid #E8E8E8',
        borderRadius: '4px',
        overflow: 'hidden',
        borderCollapse: 'separate',
        // width: '250px'
        }}>
        <TableHead>
            <TableRow sx={{
                backgroundColor: '#F5F5F5',
                }}>
                <TableCell>
                Quantity
                </TableCell>
            </TableRow>
        </TableHead>
        <TableBody>
            <TableRow>
                <TableCell sx={{ verticalAlign: 'top' }}>
                    <Box display="flex" flexDirection="column" gap={0.5}>
                    <Box sx={{ width: '450px' }}>
                        <RitzInput
                            isRequired
                            name="quantity"
                            id="quantity"
                            selectedValue={savingData?.available_quantity?.quantity}
                            handleOnChange={handleAvailableQuantityChange}
                            isReadOnly={false}
                        />
                        </Box>
                        <TableCell sx={{ paddingLeft: "0px", paddingTop: "0px", borderBottom: "none" }}>
                            <Button 
                                variant="outlined"
                                disabled
                                sx={{
                                    color: "#bdb9b9",
                                    backgroundColor:"#F3F7EC",
                                    width: "200px",
                                    borderColor: "#bdb9b9",
                                    borderRadius: '4px 4 0 0px',
                                    border: "2px solid #424242",
                                    display: "flex", 
                                    justifyContent: "flex-start",
                                    textAlign: "left",
                                    paddingLeft: "14px", 
                                    "&.Mui-disabled": {
                                        color: "black",
                                        border: "2px solid #bdb9b9",
                                    },
                                    }}
                            > 
                                {savingData?.barcode}
                            </Button>
                        </TableCell>
                    </Box>
                </TableCell>
            </TableRow>
        </TableBody>
    </Table>
);
}

export default LeftOverEditTable;