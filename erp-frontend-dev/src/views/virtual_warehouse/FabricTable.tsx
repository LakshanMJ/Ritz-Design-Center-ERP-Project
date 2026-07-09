import RitzInput from '@/components/Ritz/RitzInput';
import { Box, Button, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import React, { useState, useEffect } from 'react';

const FabricTable = ({savingData,handleExcessQuantityChange,handleBulkSavingChange,handleCuttingSavingChange,handleProductionSavingChange}:any) => {
  
  return (
    <Table sx={{
        border: '2px solid #E8E8E8',
        borderRadius: '4px',
        overflow: 'hidden',
        borderCollapse: 'separate',
        }}>
        <TableHead>
            <TableRow sx={{
                backgroundColor: '#F5F5F5',
                }}>
                <TableCell>
                Excess Quantity
                </TableCell>
                <TableCell>
                Bulk (Saving)
                </TableCell>
                <TableCell>
                Cutting (Saving)
                </TableCell>
                <TableCell>
                Production (Saving)
                </TableCell>
            </TableRow>
        </TableHead>
        <TableBody>
            <TableRow>
                <TableCell sx={{ verticalAlign: 'top' }}>
                    <Box display="flex" flexDirection="column" gap={0.5}>
                    {savingData?.excess_quantity?.quantity > 0 ? (
                            <>
                                <RitzInput
                                isRequired
                                name="excess_quantity"
                                id="excess_quantity"
                                selectedValue={savingData?.excess_quantity?.quantity}
                                handleOnChange={handleExcessQuantityChange}
                                isReadOnly={false}
                                />
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
                            </>
                            ) : (
                            <RitzInput
                                isRequired
                                name="excess_quantity"
                                id="excess_quantity"
                                selectedValue={savingData?.excess_quantity?.quantity}
                                handleOnChange={handleExcessQuantityChange}
                                isReadOnly={true}
                                sx={{ pointerEvents: 'none' }}
                            />
                            )}
                            </Box>
                </TableCell>
                <TableCell sx={{ verticalAlign: 'top'}}>
                    <Box display="flex" flexDirection="column" gap={0.5}>
                    {savingData.bulk_savings.length === 0 ? (
                        <RitzInput
                            key="empty_bulk_savings"
                            isRequired
                            name="bulk_savings_empty"
                            id="bulk_savings_empty"
                            selectedValue=""
                            handleOnChange={() => {}}
                            isReadOnly={true}        
                        />
                    ) : (
                        savingData.bulk_savings.map((item:any, index:any) => (
                            <React.Fragment key={item.id}>
                                <RitzInput
                                    isRequired
                                    name={`bulk_savings_${index}`}
                                    id={`bulk_savings_${index}`}
                                    selectedValue={item?.available_quantity?.quantity}
                                    handleOnChange={(event: any) => handleBulkSavingChange(event, index)}
                                    isReadOnly={false}
                                />
                                <TableCell sx={{ paddingLeft: "0px", paddingTop: "0px", borderBottom: "none" }}>
                                    <Button 
                                        variant="text"
                                        disabled
                                        sx={{
                                            color: "#bdb9b9",
                                            width: "200px",
                                            borderColor: "#bdb9b9",
                                            backgroundColor:"#F3F7EC",
                                            borderRadius: '4px 4px 0 0px',
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
                                        {item?.barcode}
                                    </Button>
                                </TableCell>
                            </React.Fragment>
                        ))
                    )}
                    </Box>
                </TableCell>
                <TableCell sx={{ verticalAlign: 'top' }}>
                    <Box display="flex" flexDirection="column" gap={0.5}>
                    {savingData.cutting_savings.length === 0 ? (
                        <RitzInput
                            key="empty_cutting_savings"
                            isRequired
                            name="cutting_savings_empty"
                            id="cutting_savings_empty"
                            selectedValue=""
                            handleOnChange={() => {}}
                            isReadOnly={true}
                        />
                    ) : (
                        savingData.cutting_savings.map((item:any, index:any) => (
                            <React.Fragment key={item.id}>
                                <RitzInput
                                    isRequired
                                    name={`cutting_savings_${index}`}
                                    id={`cutting_savings_${index}`}
                                    selectedValue={item?.available_quantity?.quantity}
                                    handleOnChange={(event: any) => handleCuttingSavingChange(event, index)}
                                    isReadOnly={false}
                                />
                                <TableCell sx={{ paddingLeft: "0px", paddingTop: "0px", borderBottom: "none" }}>
                                    <Button 
                                        variant="text"
                                        disabled
                                        sx={{
                                            color: "#bdb9b9",
                                            width: "200px",
                                            borderColor: "#bdb9b9",
                                            backgroundColor:"#F3F7EC",
                                            borderRadius: '4px 4px 0 0px',
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
                                        {item?.barcode}
                                    </Button>
                                </TableCell>
                            </React.Fragment>
                        ))
                    )}
                    </Box>
                </TableCell>
                <TableCell sx={{ verticalAlign: 'top' }}>
                    <Box display="flex" flexDirection="column" gap={0.5}>
                    {savingData.production_savings.length === 0 ? (
                        <RitzInput
                            key="empty_production_savings"
                            isRequired
                            name="production_savings_empty"
                            id="production_savings_empty"
                            selectedValue=""
                            handleOnChange={() => {}}
                            isReadOnly={true}
                        />
                    ) : (
                        savingData.production_savings.map((item:any, index:any) => (
                            <React.Fragment key={item.id}>
                                <RitzInput
                                    isRequired
                                    name={`production_savings_${index}`}
                                    id={`production_savings_${index}`}
                                    selectedValue={item?.available_quantity?.quantity}
                                    handleOnChange={(event: any) => handleProductionSavingChange(event, index)}
                                    isReadOnly={false}
                                />
                                <TableCell sx={{ paddingLeft: "0px", paddingTop: "0px", borderBottom: "none" }}>
                                    <Button 
                                        variant="text"
                                        disabled
                                        sx={{
                                            color: "#bdb9b9",
                                            width: "200px",
                                            borderColor: "#bdb9b9",
                                            borderRadius: '4px 4px 0 0px',
                                            backgroundColor:"#F3F7EC",
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
                                        {item?.barcode}
                                    </Button>
                                </TableCell>
                            </React.Fragment>
                        ))
                    )}
                    </Box>
                </TableCell>
            </TableRow>
        </TableBody>
    </Table>
);
}

export default FabricTable;