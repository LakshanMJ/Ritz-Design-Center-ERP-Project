import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import { Box, Checkbox, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography, useTheme } from '@mui/material';
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { createdDebitNoteDetailsURL, debitNoteStatesURL, saveDebitNoteURL } from "@/helpers/constants/rest_urls/SupplierPoUrls";
import SaveSpinner from "@/components/SaveSpinner";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import InfoIcon from '@mui/icons-material/Info';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import RitzSelection from "@/components/Ritz/RitzSelection";
import CheckBox from "@mui/icons-material/CheckBox";


const CreatedDebitNoteDetails = ({ debitNoteId }: any) => {
    const theme = useTheme()
    const [isLoading, setIsLoading] = useState(false);//Todo
    const [isSaving, setIsSaving] = useState(false);
    const [debitNoteDetails, setDebitNoteDetails] = useState<any>({});
    const [debitNoteStates, setDebitNoteStates] = useState<any>([]);
    console.log(debitNoteDetails, "debitNoteDetails")
    
    const fetchData = () => {
        setIsLoading(true);
        const requests = [
            api.get(createdDebitNoteDetailsURL(debitNoteId)),
            api.get(debitNoteStatesURL()),
        ];

        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [debitNoteDetails, debitNoteStates] = respData;
            setDebitNoteDetails(debitNoteDetails)
            setDebitNoteStates([...debitNoteStates.grn_states])
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false)
        });
    };

    const handleSave = () => {
        setIsSaving(true);
        const request = {
            method: 'post',
            url: saveDebitNoteURL(debitNoteId),
            data: {
                free_of_charge:debitNoteDetails.free_of_charge || null,
                status:debitNoteDetails.status || null,
                debit_note_attachment:debitNoteDetails.attachemnt?.id || null
            }
        }
        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);

        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsSaving(false);
        });
    };
    const handleDownload = (filePath: string, fileName: string) => {
        if (!filePath) {
            toast.error("The file cannot be located or is invalid.");
            return;
        }
        const link = document.createElement('a');
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.href = filePath;
        link.download = fileName;
        link.click();
    };

    const handleChangeState = (event: any) => {
        setDebitNoteDetails({ ...debitNoteDetails, status: event.target.value });
    }

    const handleChangeFOC = () => {
        setDebitNoteDetails((prevDetails: { free_of_charge: any; }) => ({
          ...prevDetails,
          free_of_charge: !prevDetails.free_of_charge,
        }));
      };

    useEffect(() => {
        if (debitNoteId) {
            fetchData();
        }
    }, [debitNoteId]);

    return (
        <>
            {isLoading ? <DefaultLoader /> : <>
                <Box sx={{ mb: 3 }}>
                    <Typography fontWeight='bold'>Debit Note :</Typography>
                    <TextField
                        id={'supplier_po_number'}
                        name={'supplier_po_number'}
                        value={debitNoteDetails.display_number || ''}
                        autoComplete="new-username"
                        fullWidth
                        type="text"
                        disabled
                    />
                </Box>
                <Box sx={{ mb: 3 }}>
                    <Typography fontWeight='bold'>Debit Note Version :</Typography>
                    <RitzSelection
                        id={'id'}
                        name={'debit_note_state'}
                        optionValue={'id'}
                        optionText={'name'}
                        selectedValue={debitNoteDetails.status || ''}
                        isRequired={true}
                        options={debitNoteStates}
                        handleOnChange={handleChangeState}
                    ></RitzSelection>
                </Box>
                <Box sx={{ mb: 3 }}>
                    <Typography fontWeight='bold'>Supplier Commercial Invoice Number :</Typography>
                    <TextField
                        id={'supplier_po_number'}
                        name={'supplier_po_number'}
                        value={debitNoteDetails.invoice_number || ''}
                        autoComplete="new-username"
                        fullWidth
                        type="text"
                        disabled
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Tooltip title="Download" arrow>
                            <FileDownloadIcon
                                color="primary"
                                sx={{ marginLeft: '0.1rem', verticalAlign: 'middle', fontSize: '20px', cursor: 'pointer' }}
                                onClick={() => handleDownload("www.google.com", "displayname")}
                            />
                        </Tooltip>
                        <Typography sx={{ marginLeft: '0.5rem', wordBreak: 'break-all' }}>
                            {"File.jpg"}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ mb: 3 }}>
                    <Typography style={{ fontWeight: 'bold', marginTop: '15px' }}>
                        <Checkbox checked={debitNoteDetails.free_of_charge || false}   onChange={handleChangeFOC} name="has_shade" />FOC
                    </Typography>
                </Box>
                <Box sx={{ mb: 3 }}>
                    <Table>
                        <TableHead>
                            <TableRow>

                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Descrption</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Delivery</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Quantity</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Quantity Unit</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {debitNoteDetails?.materials?.length==0 ?(
                                <TableRow><TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }} colSpan={4} align="center">No available details.</TableCell></TableRow>
                            ):(
                                debitNoteDetails?.materials?.map((material: any, materialIndex: any) => (
                                    <React.Fragment key={materialIndex}>
                                        <TableRow key={`${materialIndex}-1`}>
                                            <TableCell colSpan={7} sx={{ background: theme.palette.grey[100], border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                                                    <Typography sx={{ mr: 1, fontWeight: 'bold' }}>{material.material?.attributes?.ritz_customer_brand_reference_code}</Typography>
                                                    <Tooltip
                                                        arrow title={
                                                            <Box>
                                                                {material.material?.headers?.map((header: any, headerIndex: number) => (
                                                                    <Typography key={headerIndex} >{header.label} : {material.material?.attributes?.[header.value]}</Typography>
                                                                ))}
                                                            </Box>
                                                        }
                                                    >
                                                        <InfoIcon fontSize="small" sx={{ opacity: '60%' }} />
                                                    </Tooltip>
                                                </Box>
    
                                            </TableCell>
                                        </TableRow>
                                        <TableRow key={`${materialIndex}-2`}>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Color Tone Remediation</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material.color_tone_remediation?.delivery_date || '--'}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material.color_tone_remediation?.quantity} </TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material.color_tone_remediation?.quantity_units_display || '--'}</TableCell>
                                        </TableRow>
                                        <TableRow key={`${materialIndex}-3`}>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Defected Batches Remediation</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material.defected_remediation?.delivery_date  || '--' }</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material.defected_remediation?.quantity}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material.defected_remediation?.quantity_units_display || '--'}</TableCell>
                                        </TableRow>
                                        <TableRow key={`${materialIndex}-4`}>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Excess Remediation</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material.excess_remediation?.delivery_date  || '--' }</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material.excess_remediation?.quantity}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material.excess_remediation?.quantity_units_display || '--'}</TableCell>
                                        </TableRow>
                                        <TableRow key={`${materialIndex}-5`}>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Short Remediation</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material.short_remediation?.delivery_date  || '--'}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material.short_remediation?.quantity}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material.short_remediation?.quantity_units_display || '--'}</TableCell>
                                        </TableRow>
                                        <TableRow key={`${materialIndex}-5`}>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Mismatch Remediation</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material.mismatch_remediation?.delivery_date  || '--'}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material.mismatch_remediation?.quantity}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material.mismatch_remediation?.quantity_units_display || '--'}</TableCell>
                                        </TableRow>
                                    </React.Fragment>
                                ))
                            )}
                            
                        </TableBody>
                    </Table>
                </Box>
                <Box style={{ display: 'flex', justifyContent: 'end' }}>
                    <Button variant="contained" color="primary" onClick={handleSave} disabled={isSaving}>
                        {isSaving && <SaveSpinner />}Save
                    </Button>
                </Box>
            </>}
        </>
    );
};

export default CreatedDebitNoteDetails;
