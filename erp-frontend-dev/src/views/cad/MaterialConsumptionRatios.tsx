import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Card, IconButton, InputLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import * as RestUrls from "@/helpers/constants/RestUrls";
import {
    FABRIC_MATERIAL
} from "@/helpers/costings/materials/MaterialFieldHelper";
import RitzInput from "@/components/Ritz/RitzInput";
import api from "@/services/api";
import SaveSpinner from "@/components/SaveSpinner";
import RitzMultipleFileUploader from "@/components/Ritz/RitzMultipleFileUploader";
import { LISTVIEW } from "@/helpers/constants/FileUpload";
import FormErrorMessage from "@/components/FormErrorMessage";
import RitzSwitch from "@/components/Ritz/RitzSwitch";
import { DEFAULT_SUCCESS, VALIDATION_ERROR_CODE } from "@/helpers/constants/Constants";
import { toast } from "react-hot-toast";
import { getDefaultError, hasRole, hasRoleMultiple } from "@/helpers/Utilities";
import {CAD_USER_ROLE, MERCHANT, MERCHANT_ADMIN} from "@/helpers/constants/RoleManager";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';


const MaterialConsumptionRatios = ({ data, saveURL, orderId, colorwayTypeDetails, versionId }: any) => {
    const consumptionFieldType = 'consumption';
    const wastageFieldType = 'wastage';
    const dataKey = 'data'
    const cadDataKey = 'cad_data'
    const consumptionDataKey = 'consumption_data';
    const consumptionRatioKey = 'consumption_ratio';
    const wastageKey = 'wastage';
    const packIdKey = 'pack_id';
    const hasDataKey = 'has_data';
    const nameKey = 'name';
    const displayNameKey = 'display_name';
    const consumptionMeasuringUnitsKey = 'consumption_measuring_units';
    const headerKey = 'headers';
    const fileAttachmentLocation = `costing/consumption/othermaterial/${orderId}/${versionId}`;
    const attachmentsKey = 'attachments';
    const completeStatusKey = 'complete_status';

    const [materialConsumptionData, setMaterialConsumptionData] = useState<any>({});
    const [measuringUnits, setMeasuringUnits] = useState({});
    const measuringUnitsURL = RestUrls.getConsumptionMeasuringUnitsURL();
    const [isSaving, setIsSaving] = useState(false);
    const [formErrors, setFormErrors] = useState<any>({});
    const [completedStatus, setCompletedStatus] = useState(false);
    const canEdit = hasRoleMultiple([CAD_USER_ROLE, MERCHANT, MERCHANT_ADMIN]);


    useEffect(() => {
        api.get(measuringUnitsURL).then(resp => {
            const units = resp?.data || {};
            setMeasuringUnits({ ...units });
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        });
    }, []);


    useEffect(() => {
        if (formErrors?.[completeStatusKey]) {
            setCompletedStatus(false);
        }
    }, [formErrors]);

    const saveConsumptionData = () => {
        setIsSaving(true);
        setFormErrors({});

        const postData: any = [];
        const materialConsumptionDataCopy = structuredClone(materialConsumptionData);

        // Flatten data so that each size will have 1 row
        for (const materialKey of Object.keys(materialConsumptionDataCopy)) {
            materialConsumptionDataCopy[materialKey][dataKey].map((row: any, index: number) => {
                const consumptionDataRow = { ...row[consumptionDataKey] };
                for (const packIdKey of Object.keys(consumptionDataRow)) {
                    if (consumptionDataRow?.[packIdKey]) {
                        const dataRow = { ...row, ...consumptionDataRow[packIdKey], material_type: materialKey};
                        delete dataRow[consumptionDataKey];

                        postData.push(dataRow);
                    }
                }

            });
        }
        api.post(saveURL, { [consumptionDataKey]: postData,complete_status: completedStatus }).then(() => {
            setFormErrors({});
            toast.success(DEFAULT_SUCCESS);
        }).catch(error => {
            if (VALIDATION_ERROR_CODE === error?.response?.status && error?.response?.data?.errors) {
                setFormErrors(error.response.data.errors);
            }
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsSaving(false);
        });
    }

    useEffect(() => {
        setMaterialConsumptionData(data?.[cadDataKey]);
        setCompletedStatus(data?.[completeStatusKey])//TO Do Pending API
    }, [data])


    const handleOnChange = (event: any, materialRow: any, headerColumn: any, materialValue: any, fieldType: any, materialRowIndex: number) => {
        const { name, value } = event.target;
        const packId = headerColumn?.[packIdKey];
        const consumptionData = materialRow?.[consumptionDataKey];
        let inputData = {}
        if (fieldType == wastageFieldType) {
            inputData = { wastage: value };
        } else if (fieldType == consumptionFieldType) {
            inputData = { consumption_ratio: value }
        }
        const dataRow = { ...consumptionData?.[packId], ...inputData, material_type: materialValue };

        const materialConsumptionDataCopy = { ...materialConsumptionData }
        materialConsumptionDataCopy[materialValue][dataKey][materialRowIndex][consumptionDataKey][packId] = dataRow;
        setMaterialConsumptionData(materialConsumptionDataCopy);
    }

    const getConsumptionData = (fabricType: any, dataIndex: number, packId: number) => {
        return materialConsumptionData?.[fabricType]?.[dataKey]?.[dataIndex]?.[consumptionDataKey]?.[packId];
    }

    const handleFileChange = (attachments: any, rowIndex: number, materialValue: any, materialRowIndex: number, packId: any) => {
        console.log(materialConsumptionData);

        const materialConsumptionDataCopy = { ...materialConsumptionData };
        materialConsumptionDataCopy[materialValue][dataKey][materialRowIndex][consumptionDataKey][packId][attachmentsKey] = attachments;
        setMaterialConsumptionData(materialConsumptionDataCopy);
    };

    const handleCompletedSwitch = (event: any) => {
        setCompletedStatus(event.target.checked);
    };

    const handleCopyData = (fabricType: any, dataIndex: number, packId: number) => {
        setMaterialConsumptionData((prevData: any) => {
          const fabricTypeData = prevData?.[fabricType]?.[dataKey]?.[dataIndex]?.[consumptionDataKey];
          if (fabricTypeData) {
            const selectedConsumption = fabricTypeData[packId]?.consumption_ratio;
            const selectedWastage = fabricTypeData[packId]?.wastage;
            for (const currentPackId in fabricTypeData) {
              fabricTypeData[currentPackId].consumption_ratio = selectedConsumption;
              fabricTypeData[currentPackId].wastage = selectedWastage;
            }
          }
          return { ...prevData };
        });
      };
    
    


    return (
        <>
            {
                Object.keys(materialConsumptionData)?.map((materialValue, materialIndex) => {
                    const headers = materialConsumptionData?.[materialValue]?.[headerKey];
                    const materialData = materialConsumptionData?.[materialValue]?.[dataKey];
                    const sizesList = headers.filter((item: { is_size_field: boolean; }) => item.is_size_field === true);
                    const minPackId = sizesList.reduce((min: number, item: { pack_id: number; }) => (item.pack_id < min ? item.pack_id : min), Infinity);
                    return (
                        <Box key={`material-wrapper-${materialIndex}`}>
                        <Card key={`${materialIndex}-${materialValue}`} sx={{ mb: formErrors?.[materialValue] ? 1 : 3 }} variant='outlined'>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ background: (theme) => theme.palette.grey[50] }} colSpan={headers.length}>
                                                {materialConsumptionData?.[materialValue]?.[displayNameKey]}<br/>
                                                <Alert severity="info" variant='outlined' sx={{ border: 0, p: 0 }} >
                                                    Enter consumption data in {materialConsumptionData?.[materialValue]?.[consumptionMeasuringUnitsKey]}
                                                </Alert>
                                            </TableCell>
                                        </TableRow>

                                        <TableRow>
                                            {headers && headers.map((header: any, headerIndex: any) => (
                                                <React.Fragment key={`${materialIndex}-${headerIndex}`}>
                                                    {header?.is_size_field &&
                                                        <TableCell
                                                            key={`${materialIndex}-header-${headerIndex}`}
                                                            sx={(theme) => ({
                                                                ...(headerIndex > 0 && {
                                                                    borderLeft: `1px solid ${theme.palette.grey[200]}`,
                                                                })
                                                            })}
                                                        >
                                                            {header?.label}
                                                        </TableCell>
                                                    }
                                                    {!header?.is_size_field &&
                                                        <TableCell
                                                            key={`${materialIndex}-header-${headerIndex}`}
                                                            sx={(theme) => ({
                                                                ...(headerIndex > 0 && {
                                                                    borderLeft: `1px solid ${theme.palette.grey[200]}`,
                                                                    width: `250px`,
                                                                })
                                                            })}
                                                        >
                                                            {header?.label}
                                                        </TableCell>
                                                    }
                                                </React.Fragment>
                                            ))}

                                        </TableRow>


                                    </TableHead>
                                    <TableBody>
                                        {materialData && materialData.map((materialRow: any, materialRowIndex: any) => (
                                            <TableRow key={`table-row-${materialRowIndex}-${materialIndex}`}>
                                                {headers && headers.map((header: any, headerIndex: any) => (

                                                    <React.Fragment key={`${materialIndex}-${materialRowIndex}-${headerIndex}-table-body-row-parent`}>
                                                        {

                                                            !header?.is_size_field &&
                                                            <TableCell
                                                                key={`tablecell-${materialRowIndex}-${headerIndex}-${materialIndex}`}
                                                                sx={(theme) => ({
                                                                    ...(headerIndex > 0 && {
                                                                        borderLeft: `1px solid ${theme.palette.grey[200]}`,
                                                                    })
                                                                })}
                                                            >
                                                                {(materialValue == FABRIC_MATERIAL && header?.[nameKey] == 'placement') ? (
                                                                    <>{materialRow?.['placements'].join(", ")}</>
                                                                ) : (
                                                                    <>{materialRow?.[header?.[nameKey]]}</>
                                                                )
                                                                }
                                                            </TableCell>
                                                        }

                                                        {
                                                            header?.is_size_field &&
                                                            <>
                                                                {getConsumptionData(materialValue, materialRowIndex, header?.[packIdKey]) ? (
                                                                    <TableCell
                                                                        sx={(theme) => ({
                                                                            ...(headerIndex > 0 && {
                                                                                borderLeft: `1px solid ${theme.palette.grey[200]}`,
                                                                            })
                                                                        })}
                                                                    >
                                                                        <Box sx={{ mb: 2 }}>
                                                                            {( header?.pack_id === minPackId) ? (
                                                                                <>
                                                                                    <Box style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                                                        <Tooltip title="Copy consumption and wastage to all sizes." arrow>
                                                                                            <IconButton size='small' color='primary' onClick={() => handleCopyData(materialValue, materialRowIndex, header?.[packIdKey])}>
                                                                                                <ContentCopyIcon fontSize='inherit' />
                                                                                            </IconButton>
                                                                                        </Tooltip>
                                                                                    </Box>
                                                                                </>
                                                                            ) : (
                                                                                <Box style={{ display: 'flex', justifyContent: 'flex-end', height: '1.8rem' }} />
                                                                            )}
                                                                            <InputLabel htmlFor={`consumption-${materialRowIndex}-${headerIndex}-${materialIndex}`}>Consumption</InputLabel>
                                                                            
                                                                            <RitzInput
                                                                                fullWidth
                                                                                name={`consumption`}
                                                                                id={`consumption-${materialRowIndex}-${headerIndex}-${materialIndex}`}
                                                                                type={'number'}
                                                                                isMulti={false}
                                                                                isRequired={true}
                                                                                selectedValue={getConsumptionData(materialValue, materialRowIndex, header?.[packIdKey])?.[consumptionRatioKey]}
                                                                                // labelText={"Consumption"}
                                                                                handleOnChange={(event: any) => handleOnChange(event, materialRow, header, materialValue, consumptionFieldType, materialRowIndex)}
                                                                                isReadOnly={!canEdit || materialRow[consumptionDataKey]?.[hasDataKey] == false}
                                                                            />
                                                                        </Box>

                                                                        <Box sx={{ mb: 2 }}>
                                                                            <InputLabel htmlFor={`wastage-${materialRowIndex}-${headerIndex}-${materialIndex}`}>Wastage</InputLabel>
                                                                            <RitzInput
                                                                                fullWidth
                                                                                name={`wastage`}
                                                                                id={`wastage-${materialRowIndex}-${headerIndex}-${materialIndex}`}
                                                                                type={'number'}
                                                                                isMulti={false}
                                                                                isRequired={true}
                                                                                selectedValue={getConsumptionData(materialValue, materialRowIndex, header?.[packIdKey])?.[wastageKey]}
                                                                                // labelText={"Wastage"}
                                                                                handleOnChange={(event: any) => handleOnChange(event, materialRow, header, materialValue, wastageFieldType, materialRowIndex)}
                                                                                isReadOnly={!canEdit || materialRow[consumptionDataKey]?.[hasDataKey] == false}
                                                                            />
                                                                        </Box>
                                                                        <Box>
                                                                            <RitzMultipleFileUploader
                                                                                displayType={LISTVIEW}
                                                                                selectedFilesParent={getConsumptionData(materialValue, materialRowIndex, header?.[packIdKey])?.[attachmentsKey] || []}
                                                                                handleFileChangeParent={(selectedFiles: any, selectedItem: any) => handleFileChange(selectedFiles, selectedItem, materialValue, materialRowIndex, header?.[packIdKey])}
                                                                                filelocation={fileAttachmentLocation}
                                                                                isReadOnly={!canEdit}
                                                                            />
                                                                        </Box>
                                                                    </TableCell>
                                                                ) :
                                                                    (
                                                                        <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                            {"This size doesn't have the placement"}
                                                                        </TableCell>
                                                                    )
                                                                }
                                                            </>
                                                        }
                                                    </React.Fragment>

                                                ))}

                                            </TableRow>
                                        ))}

                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Card>
                        {formErrors?.[materialValue] &&
                            <FormErrorMessage message={formErrors?.[materialValue]} type='alert' sx={{ mb: 3 }} />}
                        </Box>
                    )
                })

            }
             <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>

               <RitzSwitch name="Complete Status" status={completedStatus} handleChangeSwitch={handleCompletedSwitch} isReadOnly={!canEdit} />
            </Box>
            { formErrors?.[completeStatusKey] &&
                            <FormErrorMessage message={formErrors?.[completeStatusKey]} ></FormErrorMessage>}
            {canEdit && <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" color="primary" onClick={saveConsumptionData} disabled={isSaving}>{isSaving && <SaveSpinner />}Save</Button>
            </Box>}

        </>
    );
};
export default MaterialConsumptionRatios;
