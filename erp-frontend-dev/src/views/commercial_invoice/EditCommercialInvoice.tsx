import React, { useEffect, useState } from 'react';
import DefaultLoader from '@/components/DefaultLoader';
import { Box, Button, InputLabel, Typography } from '@mui/material';
import RitzSingleFileUploader from '@/components/Ritz/RitzSingleFileUploader';
import { LISTVIEW } from '@/helpers/constants/FileUpload';
import SaveSpinner from '@/components/SaveSpinner';
import RitzSelection from '@/components/Ritz/RitzSelection';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";
import RitzInput from '@/components/Ritz/RitzInput';
import api from '@/services/api';
import { commercialInvoiceStatesListURL, saveCommercialInvoiceDetailsURL } from '@/helpers/constants/rest_urls/FinanceUrls';
import toast from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';

const EditCommercialInvoice = ({ commercialInvoiceId, currentState, totalPrice, debitNoteAmount, paymentDueDate, attachment, refreshData}: any) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [invoiceStates, setInvoiceStates] = useState<any>([]);
    const [invoiceData, setInvoiceData] = useState<any>({
        ci_state: currentState,
        payment_due_date: paymentDueDate,
        total_price: totalPrice,
        debit_note_total_amount: debitNoteAmount,
        attachment : attachment,
    });
 
    const fetchData = () => {
        const requests = [
            api.get(commercialInvoiceStatesListURL()),
        ];
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [invoiceStates] = respData;
            setInvoiceStates([ ...invoiceStates])
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    }

    const handleSave =()=>{
        const request = {
            method: 'post',
            url: saveCommercialInvoiceDetailsURL(commercialInvoiceId),
            data: invoiceData
        }
        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            fetchData();
            refreshData()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsSaving(false));
    }

    const handleFileChange = (attachments: any) => {
        const attachmentData = attachments.length > 0 ? attachments[0] : null;
        setInvoiceData((prevState: any) => ({
            ...prevState,
            attachment: attachmentData,
        }));
    };

    const handleChangeInvoiceData=(value: any, field: any)=>{
        setInvoiceData((prevState: any) => ({
            ...prevState,
            [field]: value,
        }));
    }
    
    useEffect(() => {
        if (commercialInvoiceId) {
            fetchData()
        }
    }, [commercialInvoiceId]);
    return (
        <>

            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box marginBottom={3}>
                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>State :</Typography>
                        <RitzSelection
                            id={'ci_state'}
                            name={'ci_state'}
                            optionValue={'id'}
                            optionText={'name'}
                            selectedValue={invoiceData?.ci_state || ''}
                            isRequired={true}
                            options={invoiceStates}
                            handleOnChange={(event: any) => handleChangeInvoiceData(event.target.value, 'ci_state')}
                        />
                    </Box>
                    <Box marginBottom={3}>
                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Total Price :</Typography>
                        <RitzInput
                        name={"total_price"}
                        id={"total_price"}
                        selectedValue={invoiceData?.total_price || ''}
                        isMulti={true}
                        multiline
                        isRequired={true}
                        handleOnChange={(event: any) => handleChangeInvoiceData(parseFloat(event.target.value), 'total_price')}
                        inputType='number'
                    />
                    </Box>
                    <Box marginBottom={3}>
                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Debit Note Amount :</Typography>
                        <RitzInput
                        name={"debit_note_total_amount"}
                        id={"debit_note_total_amount"}
                        selectedValue={invoiceData?.debit_note_total_amount || ''}
                        isMulti={true}
                        multiline
                        isRequired={true}
                        handleOnChange={(event: any) => handleChangeInvoiceData(parseFloat(event.target.value), 'debit_note_total_amount')}
                        inputType='number'
                    />
                    </Box>
                    <Box marginBottom={3}>
                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Due Date :</Typography>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                                minDate={dayjs(Date.now())}
                                format='DD/MM/YYYY'
                                value={invoiceData.payment_due_date ? dayjs(invoiceData.payment_due_date) : null}
                                 onChange={(e: any) => handleChangeInvoiceData(dayjs(e.$d).format('YYYY-MM-DD'),'payment_due_date')}
                            />
                        </LocalizationProvider>

                    </Box>
                    
                    <Box marginBottom={3}>
                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Attachment :</Typography>
                        <RitzSingleFileUploader
                            displayType={LISTVIEW}
                            selectedFilesParent={[invoiceData?.attachment]}
                            handleFileChangeParent={(selectedFiles: any) => handleFileChange(selectedFiles)}
                            filelocation={"fileAttacehemtLocation"}
                        />
                    </Box>
                    <Box sx={{ mt: 5, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="contained" disabled={isSaving} onClick={handleSave}>
                            {isSaving && <SaveSpinner />}Save
                        </Button>
                    </Box>

                </>
            )}
        </>
    );
};

export default EditCommercialInvoice;