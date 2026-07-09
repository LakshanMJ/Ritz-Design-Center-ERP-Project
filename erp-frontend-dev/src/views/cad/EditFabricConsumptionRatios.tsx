import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, IconButton, InputLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip } from '@mui/material';
import RitzInput from '@/components/Ritz/RitzInput';
import api from '@/services/api';
import DefaultLoader from "@/components/DefaultLoader";
import SaveSpinner from '@/components/SaveSpinner';
import RitzSwitch from '@/components/Ritz/RitzSwitch';
import RitzMultipleFileUploader from '@/components/Ritz/RitzMultipleFileUploader';
import { LISTVIEW } from '@/helpers/constants/FileUpload';
import router from 'next/router';
import { toast } from 'react-hot-toast';
import { getDefaultError, hasRole } from '@/helpers/Utilities';
import {VALIDATION_ERROR_CODE} from "@/helpers/constants/Constants";
import FormErrorMessage from "@/components/FormErrorMessage";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import CadRatioBreakDown from './CadRatioBreakDown';
import {CAD_USER_ROLE} from "@/helpers/constants/RoleManager";

const ConsumptionDetails = ({ getDataURL, saveDataURL }: any) => {
    const customerBrandMaterialFieldKey = 'customer_brand_material_id';
    const fabricDataDataKey = 'data';
    const consumptionRatioKey = 'consumption_ratio';
    const wastageKey = 'wastage';
    const cuttingWidthKey = 'cutting_width';
    const unitsKey = 'units';
    const supplierInquiryIdKey = 'supplier_inquiry_id';
    const supplierInquiryDetailIdKey = 'supplier_inquiry_detail_id';
    const completeStatusKey = 'complete_status';
    const fabricErrorsKey = 'fabric_errors';
    const errorsKey = 'errors';
    const { order_id, version_id} = router.query;
    const canEdit = hasRole(CAD_USER_ROLE);

    const [tableData, setTableData] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [ratios, setRatios] = useState([]);
    const [completedStatus, setCompletedStatus] = useState(false);
    const [consumptionDetails, setConsumptionDetails] = useState({ status: false });//Todo pending Get data (dummy-set status)
    const [warnings, setWarnings] = useState<any>({});
    const [formErrors, setFormErrors] = useState<any>({});
    const fileAttacehemtLocation = `costing/consumption/fabricmaterial/${order_id}/${version_id}`;
    
    const fetchData = () => {
        setIsLoading(true);
        api.get(getDataURL).then(resp => {
            const reseditdata = resp?.data || {};
            setTableData({ ...reseditdata });
            setCompletedStatus(reseditdata?.[completeStatusKey]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    const handleOnChange = (event: any, rowIndex: any, fieldName: any) => {
        const { value } = event.target;
        const currentData = [...ratios];
        currentData[rowIndex] = { ...currentData[rowIndex], [fieldName]: value };
        setRatios([...currentData]);
    };

    const handleCompletedSwitch = (event: any) => {
        setCompletedStatus(event.target.checked);
    };

    const handleSave = () => {
        setIsSaving(true);
        setWarnings({});
        console.log(ratios)

        const savePayload = {
            data: ratios.map((ratio: any) => ({
                [consumptionRatioKey]: ratio?.[consumptionRatioKey],
                [wastageKey]: ratio?.[wastageKey],
                [cuttingWidthKey]: 65,// TODO -change this
                [unitsKey]: 'Inches', // TODO - change this
                [supplierInquiryIdKey]: ratio?.[supplierInquiryIdKey],
                [supplierInquiryDetailIdKey]: ratio?.[supplierInquiryDetailIdKey],
                [customerBrandMaterialFieldKey]: ratio?.[customerBrandMaterialFieldKey],
                attachments: ratio.attachments

            })),
            complete_status: completedStatus
        };

        const request = {
            method: 'post',
            url: saveDataURL,
            data: savePayload
        }

        api(request).then(() => {
            setFormErrors({});
            fetchData();
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            if (error.response.status == VALIDATION_ERROR_CODE) {
                setFormErrors(error.response?.data?.[errorsKey]);
            }
            else {
                setWarnings({ ...error.response.data })//TO do -checking after link api
            }
        }).finally(() => setIsSaving(false));
    };

    const handleFileChange = (attachments: any, rowIndex: number) => {
        const updatedRatios = [...ratios];
            updatedRatios[rowIndex].attachments = attachments;
            setRatios(updatedRatios);
    };

    useEffect(() => {
        if (tableData?.[fabricDataDataKey]) {
            setRatios([...tableData?.[fabricDataDataKey]]);
        }
    }, [tableData]);

    useEffect(() => {
        fetchData();
        setCompletedStatus(consumptionDetails.status)//TO Do get consumption and wastage  data
    }, []);

    const [isVisibilityOn, setVisibility] = useState(false);

    const handleVisibilityClick = () => {

        setVisibility(!isVisibilityOn); // Toggle the state

    };

    return (
        <>
            <>{isLoading ? <DefaultLoader /> : <>
                {tableData?.data?.length > 0 ? <>
                    <Alert severity='info' sx={{ mb: 2 }}>
                        Enter all Consumption Ratios and Wastage values in Meters
                    </Alert>
                    <Card variant='outlined'>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        {tableData.headers?.map((header: any, index: any) => (
                                            <TableCell
                                                key={index}
                                                sx={(theme) => ({
                                                    ...(index > 0 && { borderLeft: `1px solid ${theme.palette.grey[200]}` }),
                                                    background: theme.palette.grey[50]
                                                })}
                                            >
                                                {header.label}
                                            </TableCell>
                                        ))}
                                        <TableCell
                                            sx={{
                                                borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                background: (theme) => theme.palette.grey[50]
                                            }}
                                        >
                                            Ratios
                                        </TableCell>
                                        <TableCell
                                            sx={{
                                                borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                background: (theme) => theme.palette.grey[50]
                                            }}
                                        >
                                            Attachments
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {tableData?.data?.length > 0 ? (
                                        tableData.data.map((row: any, index: any) => (
                                            <TableRow
                                                key={index}
                                                sx={{
                                                    '&:last-child td, &:last-child th': {
                                                        border: 0
                                                    }
                                                }}
                                            >
                                                {tableData.headers?.map((data: any, index2: number) => (
                                                    <TableCell
                                                        key={index2}
                                                        sx={(theme) => ({
                                                            ...(index2 > 0 && { borderLeft: `1px solid ${theme.palette.grey[200]}`, ...(index2 > 0 && { borderLeft: `1px solid ${theme.palette.grey[200]} !important` }) }),
                                                        })}
                                                    >
                                                        {data.name ? row[data.name] : row[data.name]}
                                                    </TableCell>
                                                ))}
                                                <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                {/* adding ratio breakdown part */}
                                                {/* <Box sx={{ display: 'flex', alignItems: 'right', justifyContent: 'flex-end', mb: 1 }}>
                                                    <Tooltip title="Click to show ratio break down">
                                                        <IconButton sx={{ padding: 0, margin: 0, ml: 3 }} color='primary' onClick={handleVisibilityClick}>
                                                           <FullscreenIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box> */}
                                                    <Box sx={{ mb: 2 }}>
                                                        <InputLabel htmlFor={`consumption-${index}`}>Consumption</InputLabel>
                                                        <RitzInput
                                                            fullWidth
                                                            name={`consumption`}
                                                            id={`consumption-${index}`}
                                                            type={'number'}
                                                            isMulti={false}
                                                            isRequired={true}
                                                            selectedValue={ratios[index]?.[consumptionRatioKey]}
                                                            handleOnChange={(event: any) => handleOnChange(event, index, consumptionRatioKey)}
                                                            // labelText={"Consumption"}
                                                            isReadOnly={!canEdit || tableData.costing_version_state =='complete' ? true : false}
                                                        />
                                                    </Box>

                                                    <Box sx={{ mb: 2 }}>
                                                        <InputLabel htmlFor={`wastage-${index}`}>Wastage</InputLabel>
                                                        <RitzInput
                                                            fullWidth
                                                            name={`wastage`}
                                                            id={`wastage-${index}`}
                                                            type={'number'}
                                                            isMulti={false}
                                                            isRequired={true}
                                                            selectedValue={ratios[index]?.[wastageKey]}
                                                            handleOnChange={(event: any) => handleOnChange(event, index, wastageKey)}
                                                            // labelText={"Wastage"}
                                                            isReadOnly={!canEdit || tableData.costing_version_state =='complete' ? true : false}
                                                        />
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                    <RitzMultipleFileUploader
                                                    displayType={LISTVIEW}
                                                    selectedFilesParent={ratios[index]?.attachments || []}
                                                    handleFileChangeParent={(selectedFiles: any) => handleFileChange(selectedFiles, index)}
                                                    filelocation={fileAttacehemtLocation}
                                                    isReadOnly={!canEdit || tableData.costing_version_state =='complete' ? true : false}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={tableData.headers?.length + 1 || 1} align='center'>No data found</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Card>
                    {isVisibilityOn && (
                    <>
                        <Box sx={{ display: 'flex', marginTop: 2, justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}><FiberManualRecordIcon style={{ color: '#1564B2' }} />
                                <Box sx={{ color: '#1564B2' }}>Ratio break down</Box>
                            </Box>
                            <Box>
                                <Tooltip title="Click to minimize ratio break down">
                                    <IconButton sx={{ padding: 0, margin: 0, ml: 3 }} color='primary' onClick={handleVisibilityClick}>
                                        <FullscreenExitIcon />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>
                        <Box sx={{ mt: 2 }}>
                            <Card variant='outlined'><CadRatioBreakDown /></Card>
                        </Box>
                    </>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                        <RitzSwitch name="Complete Status" status={completedStatus} handleChangeSwitch={handleCompletedSwitch} isReadOnly={!canEdit || tableData.costing_version_state =='complete' ? true : false} />
                    </Box>

                    {formErrors?.[completeStatusKey] &&<FormErrorMessage message={formErrors?.[completeStatusKey]} ></FormErrorMessage>}

                    {formErrors?.[fabricErrorsKey] && <FormErrorMessage message={formErrors?.[fabricErrorsKey] || []} isList={true}/>}

                    {(canEdit && tableData.costing_version_state !=='complete') && <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                        <Button variant="contained" color="primary" onClick={handleSave}  disabled={isSaving}>{isSaving && <SaveSpinner />}Save</Button>
                    </Box>}
                </> : <Alert color='info' icon={false}>No materials have been specified yet.</Alert>}
            </>}</>
        </>
    );
};

export default ConsumptionDetails;