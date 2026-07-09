import React, { useEffect, useState } from 'react';
import { formatAmount, getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import api from '@/services/api';
import { Alert, Box, Button, InputLabel, Table, TableBody, TableCell, TableHead, TableRow, TextField, useTheme } from '@mui/material';
import { customersURL } from '@/helpers/constants/RestUrls';
import { financePaymentMethodsURL, pclBankInformationBasicDetailsURL, pclBankInformationListURL, pclListToDropdownURL, pclPaymentSettlementSaveURL } from '@/helpers/constants/rest_urls/FinanceUrls';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";
import RitzSelection from '@/components/Ritz/RitzSelection';
import RitzSearchableServerRender from '@/components/Ritz/RitzSearchableServerRender';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import FormErrorMessage from '@/components/FormErrorMessage';
import RitzInput from '@/components/Ritz/RitzInput';

const SettlementDetails = ({ selectedData, refreshData }: any) => {
    const theme = useTheme();
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [settlementData, setSettlementData] = useState<any>([...selectedData]);
    const [paymentTypes, setPaymentTypes] = useState<any>([])
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any>({})
    const [errors, setErrors] = useState<any>({})

    const fetchMetaData = () => {
        const requests = [
            api.get(financePaymentMethodsURL())
        ];
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [paymentTypes] = respData;
            setPaymentTypes([...paymentTypes])
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false)
        });
    }

    const handleChangeUniqueInputs = (value: any, field: any) => {
        setSelectedPaymentMethod((prevState: any) => ({
            ...prevState,
            [field]: value,
        }));
        if (field === 'pcl_bank_information_id' && value) {
            handlePCLBankInformationChange(value)
        }
        if(field === 'type'){
            setErrors({})
        }
    };

    const handlePCLBankInformationChange = (value: any) => {
        api.get(pclBankInformationBasicDetailsURL(value)).then(resp => {
            setSelectedPaymentMethod((prevState: any) => ({
                ...prevState,
                balance: resp.data.pcl_balance_amount?.amount
            }));
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally();
    }

    const handleChangeInputs = (value: any, field: string, index: number) => {
        setSettlementData((prevData: any) => {
            const updatedData = [...prevData];
            if (field === 'balance') {
                updatedData[index] = {
                    ...updatedData[index],
                    [field]: { ...updatedData[index][field], amount: value },
                };
            } else {
                updatedData[index] = {
                    ...updatedData[index],
                    [field]: value,
                };
            }
            return updatedData;
        });
    };

    const handleSave = () => {
        const saveData ={
            type: selectedPaymentMethod?.type || null,
            pcl_start_date: selectedPaymentMethod?.pcl_start_date || null,
            pcl_end_date: selectedPaymentMethod?.pcl_end_date || null,
            pcl_settle_date: selectedPaymentMethod?.pcl_settle_date || null,
            pcl_bank_information_id: selectedPaymentMethod?.pcl_bank_information_id || null,
            payments: settlementData
        }
        api.post(pclPaymentSettlementSaveURL(), saveData).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            refreshData(true)
            setErrors({})
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            setErrors(error?.response?.data)
        }).finally();

    }

    useEffect(() => {
        fetchMetaData()
    }, []);

    return (
        <>
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box>
                        <Box marginBottom={3} sx={{ width: '50%' }}>
                            <InputLabel sx={{ mb: 1 }}>Select Payment Method:</InputLabel>
                            <RitzSelection
                                id={'type'}
                                name={'type'}
                                optionValue={'id'}
                                optionText={'name'}
                                selectedValue={selectedPaymentMethod?.type}
                                isRequired={true}
                                options={paymentTypes}
                                handleOnChange={(e: any) => handleChangeUniqueInputs(e.target.value, 'type')}
                            />
                            <FormErrorMessage message={errors?.payment_type} />
                        </Box>
                        {selectedPaymentMethod?.type === 'pcl' && (
                            <Box marginBottom={3} sx={{ width: '50%' }}>
                                <InputLabel sx={{ mb: 1 }}>Select PCL:</InputLabel>
                                <RitzSearchableServerRender
                                    id={"pcl_bank_information_id"}
                                    name={"pcl_bank_information_id"}
                                    optionValue={"id"}
                                    optionText={"display_number"}
                                    selectedValue={selectedPaymentMethod?.pcl_bank_information_id}
                                    isRequired={true}
                                    handleOnChange={(value: any) => { handleChangeUniqueInputs(value, 'pcl_bank_information_id'); }}
                                    optionUrl={(searchtext: string) => pclListToDropdownURL(searchtext)}
                                />
                                <FormErrorMessage message={errors?.pcl_bank_information} />
                            </Box>
                        )}
                        {(selectedPaymentMethod?.pcl_bank_information_id && selectedPaymentMethod?.type === 'pcl') && (
                                <>
                                    <Box marginBottom={3} sx={{ width: '50%' }}>
                                        <InputLabel sx={{ mb: 1 }}>PCL Facility Balance Amount (USD):</InputLabel>
                                        <RitzInput
                                            name={'balance'}
                                            id={'balance'}
                                            selectedValue={selectedPaymentMethod?.balance}
                                            isReadOnly={true}
                                        ></RitzInput>
                                    </Box>
                                    <Box marginBottom={3}>
                                        <InputLabel sx={{ mb: 1 }}>PCL Start Date:</InputLabel>
                                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                                            <DatePicker
                                                format='DD/MM/YYYY'
                                                value={selectedPaymentMethod?.pcl_start_date ? dayjs(selectedPaymentMethod?.pcl_start_date) : null}
                                                onChange={(e: any) => handleChangeUniqueInputs(dayjs(e.$d).format('YYYY-MM-DD'), 'pcl_start_date')}
                                            />
                                        </LocalizationProvider>
                                        <FormErrorMessage message={errors?.pcl_start_date} />
                                    </Box>
                                    <Box marginBottom={3}>
                                        <InputLabel sx={{ mb: 1 }}>PCL End Date:</InputLabel>
                                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                                            <DatePicker
                                                format='DD/MM/YYYY'
                                                value={selectedPaymentMethod?.pcl_end_date ? dayjs(selectedPaymentMethod?.pcl_end_date) : null}
                                                onChange={(e: any) => handleChangeUniqueInputs(dayjs(e.$d).format('YYYY-MM-DD'), 'pcl_end_date')}
                                            />
                                        </LocalizationProvider>
                                        <FormErrorMessage message={errors?.pcl_end_date} />
                                    </Box>
                                </>
                            )}
                    </Box>
                    <Box>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ background: theme.palette.grey[100] }}>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>SPO / CI</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Supplier</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Total Amount (USD)</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Paid Amount (USD)</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Balance Amount (USD)</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Amount (USD)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {settlementData?.map((settlement: any, settlementIndex: any) => (
                                    <TableRow key={keyHelper.getNextKeyValue()} sx={{ background: '#fff' }}>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{settlement?.display_number}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{settlement?.supplier_name}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{formatAmount(settlement?.amount?.amount)}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{formatAmount(settlement?.paid_amount?.amount)}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{formatAmount(settlement?.balance_display?.amount)}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                            <TextField
                                                id={'balance'}
                                                type={'number'}
                                                value={settlement?.balance?.amount || ''}
                                                name={'amount'}
                                                sx={{ width: '100%' }}
                                                required
                                                onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                                                onChange={(event: any) => { handleChangeInputs(parseFloat(event?.target?.value), 'balance', settlementIndex) }}
                                            />
                                            <FormErrorMessage message={errors?.payments?.[settlement?.index]?.balance} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                    <Box>
                        {errors?.exceed_pcl_value &&(
                            <Alert severity="error"sx={{ mt: 1 }}>{errors?.exceed_pcl_value}</Alert>
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'end', mt: 2 }}>
                        <Button variant="contained" color="primary" onClick={() => {handleSave()}}>Save</Button>
                    </Box>
                </>
            )}
        </>
    );
};

export default SettlementDetails;
