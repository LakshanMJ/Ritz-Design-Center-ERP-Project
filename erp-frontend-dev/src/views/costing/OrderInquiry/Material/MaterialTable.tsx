import * as React from 'react';
import {Table, TableContainer, TableHead, TableRow, Paper, TableCell, TableBody, FormControlLabel, Radio} from "@mui/material";

const MaterialTable = ({ helper, headers, headerLabelField, valueField, displayValueFunction, displayData, keyPrefix='table',
                       consumptionHeaders, showConsumptionHeaders=false, handleSupplierSelect, selectedMaterialSupplier }: any) => {



    return (
        <TableContainer>
            <Table>
                <TableHead>
                    <TableRow>
                        {
                            headers?.map((header: any, index: number) => (
                                <TableCell  
                                key={`${keyPrefix}-${index}-material-header`} 
                                align="left"
                                sx={header?.isAction ? {width: '130px'}:null }>{header?.[headerLabelField] }</TableCell>
                            ))
                        }
                        {
                            showConsumptionHeaders && consumptionHeaders?.map((header: any, index: number) => (
                                <TableCell key={`${keyPrefix}-${index}-consumption-header`} align="left">{header?.[headerLabelField]}</TableCell>
                            ))
                        }

                    </TableRow>
                </TableHead>
                <TableBody>
                    { ! showConsumptionHeaders ? (
                        displayData?.map((dataRow: any, index: number) => (
                            <TableRow key={`${keyPrefix}-${index}-body`}>
                                {
                                    headers?.map((header: any, index2: number) => (
                                        <TableCell key={`${keyPrefix}-${index}-${index2}-cell-val`} sx={dataRow?.isAction ? {width: '30px'}: null}>
                                            {displayValueFunction(header, dataRow)}
                                        </TableCell>

                                    ))
                                }
                            </TableRow>
                        ))
                    ) : (
                        displayData?.map((dataRow: any, index: number) => (
                            dataRow?.['supplier_inquiries']?.length > 0  ? (
                                dataRow?.['supplier_inquiries'].map((supplierInquiryDetail: any, index2: number) => (

                                    <TableRow key={`${keyPrefix}-${index}-${index2}-body`}>
                                        {
                                            headers?.map((header: any, index3: number) => (
                                                <TableCell key={`${keyPrefix}-${index}-${index2}${index3}--cell-val`}
                                                           sx={dataRow?.isAction ? {width: '100px;'} : null}>
                                                    <>

                                                    {index2 == 0 && displayValueFunction(header, {...dataRow, ...supplierInquiryDetail})}
                                                    {header?.[helper.isSelectFieldKey] &&
                                                            <Radio
                                                                  checked={selectedMaterialSupplier?.[dataRow?.['customer_brand_material_id']] == supplierInquiryDetail?.['supplier_inquiry_detail_id']}
                                                                  onClick={() => handleSupplierSelect(dataRow, supplierInquiryDetail)}
                                                                  name="radio-buttons"
                                                                  inputProps={{ 'aria-label': 'A' }}
                                                                />
                                                    }
                                                    </>

                                                </TableCell>

                                            ))
                                        }
                                        {
                                            consumptionHeaders?.map((header: any, index3: number) => (
                                                <TableCell key={`${keyPrefix}-${index}-${index2}-${index3}-supplier-cell-val`}
                                                           sx={dataRow?.isAction ? {width: '100px;'} : null}>
                                                    {displayValueFunction(header, {...dataRow, ...supplierInquiryDetail})}
                                                </TableCell>

                                            ))
                                        }

                                    </TableRow>
                                ))) : (
                                    <TableRow key={`${keyPrefix}-${index}-body`}>
                                        {
                                            headers?.map((header: any, index3: number) => (
                                                <TableCell key={`${keyPrefix}-${index}-${index}${index3}--cell-val`}
                                                           sx={dataRow?.isAction ? {width: '100px;'} : null}>
                                                    {displayValueFunction(header, {...dataRow})}
                                                </TableCell>

                                            ))
                                        }
                                        {
                                            consumptionHeaders?.map((header: any, index3: number) => (
                                                <TableCell key={`${keyPrefix}-${index}-${index3}-supplier-cell-val`}
                                                           sx={dataRow?.isAction ? {width: '100px;'} : null}>
                                                    {displayValueFunction(header, {...dataRow})}
                                                </TableCell>
                                            ))
                                        }

                                    </TableRow>

                                )
                            )
                        )
                    )
                }
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default MaterialTable;