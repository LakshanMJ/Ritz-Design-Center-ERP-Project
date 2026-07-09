import React, { useState, useEffect } from 'react';
import RitzSelection from '@/components/Ritz/RitzSelection';
import api from '@/services/api';
import * as RestUrls from '../../helpers/constants/RestUrls';
import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox, Paper } from '@mui/material';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import RitzSearchableServerRender from '@/components/Ritz/RitzSearchableServerRender';
import DefaultLoader from '@/components/DefaultLoader';
import { itemsPaginationListURL } from '../../helpers/constants/RestUrls';

const CopyOperation = ({ selecteditemId, variationId }: any) => {
    const [isLoading, setIsLoading] = useState(true);
    const [selectedData, setSelectedData] = useState<any>({ item: selecteditemId, currenetVariation: null });
    const [variations, setVariations] = useState<any>([]);
    const [operations, setOperations] = useState<any[]>([]);
    const [selectedCheckboxData, setSelectedCheckboxData] = useState<any[]>([]);
    const [selectAll, setSelectAll] = useState(true); 

    console.log('existingVariationId:', variationId);
    console.log('currentVariation:', selectedData.currenetVariation);
    console.log('selectedCheckboxData:', selectedCheckboxData);

    const fetchVariations = (itemId: number) => {
        api.get(RestUrls.getItemVariationsURL(itemId))
            .then((response) => {
                setVariations(response.data.variations || []);
            })
            .catch((error) => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => {
                setIsLoading(false);
            });
    };

    const fetchOperations = (variationId: number) => {
        const variation = variations.find((v: any) => v.id === variationId);
        if (variation) {
            setOperations(variation.operations || []);
            const allOperationIds = variation.operations.map((operation: any) => operation.id);
            setSelectedCheckboxData(allOperationIds); // Set all operations as selected
        }
    };

    const handleSelectChange = (value: any, field: any) => {
        setSelectedData({ ...selectedData, [field]: value });
    };

    const handleCheckboxChange = (operationId: number) => {
        setSelectedCheckboxData((prevSelected) => {
            if (prevSelected.includes(operationId)) {
                return prevSelected.filter((id) => id !== operationId);
            } else {
                return [...prevSelected, operationId];
            }
        });
    };

    const handleSelectAllCheckboxChange = () => {
        if (selectAll) {
            setSelectedCheckboxData([]);
        } else {
            const allOperationIds = operations.map((operation: any) => operation.id);
            setSelectedCheckboxData(allOperationIds);
        }
        setSelectAll(!selectAll);
    };

    const handleCopyOperation = () => {
        const sourceItemId = variationId;
        const destinationItemId = selectedData.currenetVariation;

        api.post(RestUrls.CopyOperationURL(sourceItemId, destinationItemId), {selected_item_operation_ids: selectedCheckboxData,})
            .then((response) => {
                toast.success("Operation copied successfully!");
            })
            .catch((error) => {
                toast.error(getDefaultError(error?.response?.status));
            });
    };

    useEffect(() => {
        if (selectedData?.item) {
            fetchVariations(selectedData?.item);
        }
        if (selectedData?.currenetVariation) {
            fetchOperations(selectedData?.currenetVariation);
        }
    }, [selectedData?.item, selectedData?.currenetVariation]);

    return (
        <Box sx={{ mb: 3 }}>
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box sx={{ mb: 2 }}>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
                            Item
                        </label>
                        <RitzSearchableServerRender
                            id="costing"
                            name="costing"
                            optionValue="id"
                            optionText="name"
                            selectedValue={selectedData?.item}
                            isRequired={true}
                            handleOnChange={(value: any) => handleSelectChange(value, 'item')}
                            optionUrl={(searchtext: string) => itemsPaginationListURL(searchtext)}
                        />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
                            Item Colorway Type
                        </label>
                        <RitzSelection
                            id="variation_id"
                            name="variation_id"
                            optionValue="id"
                            optionText="variation_name"
                            selectedValue={selectedData?.currenetVariation}
                            isRequired={true}
                            options={variations}
                            handleOnChange={(event: any) => handleSelectChange(event?.target?.value, 'currenetVariation')}
                        />
                    </Box>
                    <TableContainer component={Paper} sx={{ mb: 2 }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectAll}
                                            onChange={handleSelectAllCheckboxChange}
                                        />
                                    </TableCell>
                                    <TableCell>Operations</TableCell>
                                    <TableCell>Costed SMV</TableCell>
                                    <TableCell>Factory SMV</TableCell>
                                    <TableCell>Machine Type</TableCell>
                                    <TableCell>Folder Type</TableCell>
                                    <TableCell>Video</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {operations.map((operation: any) => (
                                    <TableRow key={operation.id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedCheckboxData.includes(operation.id)}
                                                onChange={() => handleCheckboxChange(operation.id)}
                                            />
                                        </TableCell>
                                        <TableCell>{operation.operation_name}</TableCell>
                                        <TableCell>{operation.costing_smv}</TableCell>
                                        <TableCell>{operation.factory_smv}</TableCell>
                                        <TableCell>{operation.machine_type_name}</TableCell>
                                        <TableCell>{operation.folder_type_name}</TableCell>
                                        <TableCell>{operation.video}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleCopyOperation}
                            disabled={!selectedData.currenetVariation || selectedCheckboxData.length === 0}
                        >
                            Copy Operation
                        </Button>
                    </Box>
                </>
            )}
        </Box>
    );
};

export default CopyOperation;