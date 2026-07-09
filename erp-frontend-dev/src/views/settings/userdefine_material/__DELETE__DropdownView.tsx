import { Box, DialogActions, DialogContent, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';

const DropDownDetails = ({ isModal, attributeId, material }: any) => {
    const [rows, setRows] = useState([]);

    useEffect(() => {
        if (attributeId > 0 && material?.userdefinedmaterialattribute_set) {
            const selectedAttribute = material.userdefinedmaterialattribute_set.find((attribute: any) => attribute.id === attributeId);
            if (selectedAttribute?.userdefineddropdownoption_set) {
                setRows(selectedAttribute.userdefineddropdownoption_set);
            }
        }
    }, [attributeId, material]);

    const getContent = () => {
        return (
            <Table>
                {/* <TableHead>
                    <TableRow>
                        <Typography style={{ textAlign: 'left', fontSize: '16px', fontWeight: '' }}>Dropdown options</Typography>
                    </TableRow> 
                </TableHead> */}
                <TableBody>
                    {rows.map((row: any, index: number) => (
                        <TableRow key={index}>
                            <TableCell>
                                {row ? (
                                    <li>{row.display_value}</li>
                                ) : (
                                    <Typography style={{ textAlign: 'center' }}>There is no dropdown option</Typography>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    };

    return (
        <>
            {isModal ? (
                <>
                    <DialogContent dividers={true}>
                        {getContent()}
                    </DialogContent>
                    <DialogActions></DialogActions>
                </>
            ) : (
                <>
                    {getContent()}
                    <Box marginTop={5}></Box>
                </>
            )}
        </>
    );
};

export default DropDownDetails;
