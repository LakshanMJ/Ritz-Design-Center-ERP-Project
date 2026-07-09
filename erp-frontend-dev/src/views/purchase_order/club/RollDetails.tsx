import React, { useEffect, useState } from 'react';
import { Box, Button, Checkbox, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from '@mui/material';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import FormErrorMessage from '@/components/FormErrorMessage';
import CheckBox from '@mui/icons-material/CheckBox';

const RollDetails = ({ wrwr, poIndex, supplierIndex, handleOnchangeSupplierDetails, handleOnChangeDeletedIds, totQty }: any) => {
    const [balanceQty, setBalanceQty] = useState(0);
    const [qtyErrorStatus, setQtyErrorStatus] = useState({});
    const [checkAll, setCheckAll] = useState(false);
    const totalQtyExceedKey = `Check Balance Qty: ${balanceQty}`;
    const inhousematerialSetKey = 'inhousematerial_set';
    const purchaseOrderClubBomSuppliersKey = 'purchase_order_club_bom_suppliers';
    const [supplierDetails, setSupplierDetails] = useState<any>([{
        id: 14,
        barcode: 'BR0123',
        cutting_width: 67,
        quantity: 14,
        is_empty: '',
        checked: true,
        manually_added: false
    }]);

    const addNewRow = () => {
        const newRollDetail = { id: null as any, barcode: '', cutting_width: '', quantity: '', is_empty: '', checked: true, manually_added: true };
        setSupplierDetails((prevDetails: any) => [...prevDetails, newRollDetail]);
    };

    const deleteRow = (rollIndex: any, deleteId: any) => {

    };

    const handleChangeRollDetails = (event: any, rollIndex: any) => {
        const { name, value } = event.target;
        const updatedSupplierDetails = [...supplierDetails];
        updatedSupplierDetails[rollIndex] = { ...updatedSupplierDetails[rollIndex], [name]: value };
        setSupplierDetails(updatedSupplierDetails);
    };
    const handleChangeRollWidthAndQunatity = (event: any, rollIndex: any) => {
        const { name, value } = event.target;
        const updatedSupplierDetails = [...supplierDetails];
        updatedSupplierDetails[rollIndex] = { ...updatedSupplierDetails[rollIndex], [name]: value };
        setSupplierDetails(updatedSupplierDetails);
    };
    const handleCheckboxChange = (rollIndex: any) => {
        const updatedSupplierDetails = [...supplierDetails];
        updatedSupplierDetails[rollIndex].checked = !updatedSupplierDetails[rollIndex].checked;
        setSupplierDetails(updatedSupplierDetails);
        setCheckAll(updatedSupplierDetails.every(detail => detail.checked));
    };
    const handleCheckAll = () => {
        const updatedCheckAll = !checkAll;
        setCheckAll(updatedCheckAll);
        setSupplierDetails((prevDetails: any[]) => 
            prevDetails.map((detail: any) => ({ ...detail, checked: updatedCheckAll }))
        );
    };

    const handleChangeRollQunatity = (event: any, rollIndex: any) => {
        setQtyErrorStatus({});
        const { name, value } = event.target;
        const updatedSupplierDetails = [...supplierDetails];
        updatedSupplierDetails[rollIndex] = { ...updatedSupplierDetails[rollIndex], [name]: parseFloat(value) };
        setSupplierDetails(updatedSupplierDetails);
    };

    return (
        <Box marginBottom={4}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Button variant="outlined" onClick={addNewRow}>Add Roll</Button>
            </Box>
            <TableContainer component={Paper}>
                <Table sx={{ overflow: 'hidden' }}>
                    <TableHead>
                        <TableRow>
                            <TableCell><Checkbox checked={checkAll} onChange={handleCheckAll} /></TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>Barcode</TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>Width (Mtrs)</TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>Quantity (Mtrs)</TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {supplierDetails?.map((roll: any, rollIndex: any) => (
                            <TableRow key={rollIndex}>
                                <TableCell ><Checkbox checked={roll.checked || false} onChange={() => handleCheckboxChange(rollIndex)} /></TableCell>
                                <TableCell sx={{ textAlign: 'center' }}>
                                    {roll.manually_added ? (
                                        <TextField
                                            variant="outlined"
                                            name='barcode'
                                            fullWidth
                                            size='small'
                                            value={roll.barcode || ''}
                                            onChange={(event) => handleChangeRollDetails(event, rollIndex)}
                                        />
                                    ) : (
                                        roll.barcode
                                    )}
                                </TableCell>
                                <TableCell sx={{ textAlign: 'center' }}>
                                    {roll.manually_added ? (
                                        <TextField
                                            variant="outlined"
                                            name='cutting_width'
                                            fullWidth
                                            size='small'
                                            type='number'
                                            value={roll.cutting_width || ''}
                                            onChange={(event) => handleChangeRollDetails(event, rollIndex)}
                                        />
                                    ) : (
                                        roll.cutting_width
                                    )}
                                </TableCell>
                                <TableCell sx={{ textAlign: 'center' }}>
                                    {roll.manually_added ? (
                                        <TextField
                                            variant="outlined"
                                            name='quantity'
                                            fullWidth
                                            size='small'
                                            type='number'
                                            value={roll.quantity || ''}
                                            onChange={(event) => handleChangeRollQunatity(event, rollIndex)}
                                        />
                                    ) : (
                                        roll.quantity
                                    )}
                                </TableCell>
                                <TableCell style={{ textAlign: 'right' }}>
                                    <IconButton onClick={() => deleteRow(1, 2)}>
                                        <DeleteForeverIcon style={{ color: '#d32f2f' }} fontSize='inherit' />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default RollDetails;