import DefaultLoader from '@/components/DefaultLoader';
import RitzInput from '@/components/Ritz/RitzInput';
import RitzRadio from '@/components/Ritz/RitzRadio';
import RitzTable from '@/components/Ritz/RitzTable';
import { Alert, Box, Button, Card, Divider, FormControl, FormControlLabel, FormLabel, Grid, IconButton, InputLabel, Link, Paper, Radio, RadioGroup, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { ColumnDef } from '@tanstack/react-table';
import React, { useEffect, useRef, useState } from 'react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import SaveSpinner from '@/components/SaveSpinner';
import RitzModal from '@/components/Ritz/RitzModal';
import api from '@/services/api';
import * as GrnUrls from '../../helpers/constants/rest_urls/GrnUrls';
import { getDefaultError } from '@/helpers/Utilities';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CustomerBrandMaterialDetail from '../settings/userdefine_material/MaterialDetail';
import toast from 'react-hot-toast';
import CreatableSelect from 'react-select/creatable';

const FabricShrinkage = ({ sourceId, poClubId }: any) => {

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState({ status: false, changedType: 0, materialIndex: null });
  const [columnDef, setColumnDef] = useState([]);
  const [saveClicked, setSaveClicked] = useState('');
  const [materialData, setMaterialData] = useState({ shrinkage_materials: [], is_wash_garment: false });
  const [shrinkageTimeFrameData, setShrinkageTimeFrameData] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState(0);
  const [selectedShrinkLot, setSelectedShrinkLot] = useState();
  const [ShrinkLotList, setShrinkLotList] = useState<any>([]);
  const [uniquePlacements, setUniqueplacements] = useState<any>([]);

  const handleChange = (selectedOption:any, rollIndex:any, materialId:any) => {
    const materialIndex = materialData.shrinkage_materials.findIndex(item => item.id === materialId);
    const updatedMaterialDataArray = [...materialData.shrinkage_materials];
    const selectedMaterial = updatedMaterialDataArray[materialIndex];
    const updatedShrinkLot = { ...selectedMaterial.shrink_lot_group_data[rollIndex] };
    


  if (selectedOption) {
    if (selectedOption.__isNew__) {
 
      updatedShrinkLot.shrinkage_lot = null;
      updatedShrinkLot.shrinkage_lot_name = selectedOption.label;
    } else {

      updatedShrinkLot.shrinkage_lot = selectedOption.value;
      updatedShrinkLot.shrinkage_lot_name = selectedOption.label;
    }
  } else {
    updatedShrinkLot.shrinkage_lot_name = null,
    updatedShrinkLot.shrinkage_lot =  null
  }
  selectedMaterial.shrink_lot_group_data[rollIndex] = updatedShrinkLot;
        updatedMaterialDataArray[materialIndex] = selectedMaterial;
        setMaterialData({
          ...materialData,
          shrinkage_materials: updatedMaterialDataArray
        });  
}
    
  const handleOnChangeHourSelection = (event: any, materialId: any) => {
    const { name, value } = event.target;
    const index = materialData.shrinkage_materials.findIndex(item => item.id === materialId);
    if (index !== -1) {

      if (materialData.shrinkage_materials?.[index].shrinkage_test_time_frame && (materialData.shrinkage_materials?.[index].shrinkage_test_time_frame === '24_hours' || materialData.shrinkage_materials?.[index].shrinkage_test_time_frame === '48_hours')) {
        setIsModalOpen({ status: true, changedType: event.target.value, materialIndex: index });
        setMaterialData(prevState => {
          const newData = { ...prevState };
          newData.shrinkage_materials = [...newData.shrinkage_materials];
          newData.shrinkage_materials[index] = { ...newData.shrinkage_materials[index], shrinkage_test_time_frame: value };
          return newData;
        });
      } else {
        setMaterialData(prevState => {
          const newData = { ...prevState };
          newData.shrinkage_materials = [...newData.shrinkage_materials];
          newData.shrinkage_materials[index] = { ...newData.shrinkage_materials[index], shrinkage_test_time_frame: value };
          return newData;
        });
      }
    }
  };

  const handleOnClickOK = () => {
    const updatedMaterialDataArray = [...materialData.shrinkage_materials];
    const selectedMaterial = updatedMaterialDataArray[isModalOpen.materialIndex];

    if (selectedMaterial && selectedMaterial.supplierposhrinkagevalue_set) {
      selectedMaterial.supplierposhrinkagevalue_set = selectedMaterial.supplierposhrinkagevalue_set.map((material: any) => ({
        ...material,
        residual_shrinkage_length: null,
        residual_shrinkage_width: null,
        steam_shrinkage_length: null,
        steam_shrinkage_width: null,
        wash_shrinkage_length: null,
        wash_shrinkage_width: null,
      }));

      setMaterialData({
        ...materialData,
        shrinkage_materials: updatedMaterialDataArray,
      });
      handleOnClickCancel()
    }
  };
  const handleOnClickCancel = () => {
    setIsModalOpen({ status: false, changedType: 0, materialIndex: null });
  };

  const handleInputnOnChange = (event: any, materialIndex: number, rollIndex: number) => {
    const { name, value } = event.target;
    const updatedShrinkageMaterials = [...materialData.shrinkage_materials];
    const updatingMaterial = updatedShrinkageMaterials?.[materialIndex].supplierposhrinkagevalue_set?.[rollIndex];
    const copysubRowDetails = { ...updatingMaterial, [name]: parseFloat(value) };

    updatedShrinkageMaterials[materialIndex].supplierposhrinkagevalue_set[rollIndex] = copysubRowDetails;
    setMaterialData({
      ...materialData,
    });
  };

  const fetchData = () => {

    const requests = [
      api.get(GrnUrls.fabricShrinkageDetailsUrl(sourceId)),
      api.get(GrnUrls.shrinkageTimeFrameDataUrl()),
    ];

    Promise.all(requests).then(resp => {
      const response = resp.map((r: any) => r.data);
      const [shrinkageData, shrinkageTimeFrame] = response
      setMaterialData(shrinkageData)
      setShrinkageTimeFrameData([...shrinkageTimeFrame.shrinkage_test_time_frames])
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    })
  }

  useEffect(() => {
    if (sourceId) {
      fetchData()
    }
  }, [sourceId]);

  const handleSave = () => {

    const shrinkage_materials = [
      ...materialData.shrinkage_materials
    ]

    api.post(GrnUrls.fabricShrinkageUrlCreateUrl(sourceId), { shrinkage_materials }).then(resp => {
      const response = resp.data || []
      if (response) {
        fetchData()
        toast.success(DEFAULT_SUCCESS);
      }

    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally();
  }

  const getRowCanExpand = (row: any) => {
    const subRows = row?.original?.supplierposhrinkagevalue_set || [];
    return subRows.length > 0;
  };
  
  const handleRowExpand = (row: any) => {
    row.toggleExpanded();
  }
  
  const handleReferenceCodeDetailOnClick = (openState: boolean, materialId:any) => {
    setShowDetails(openState);
    setSelectedMaterialId(materialId);
  }

  const renderSubRow = ({ row }: any) => {
    const firstSubRows = row?.original?.supplierposhrinkagevalue_set || [];
    const secondSubRows = row?.original?.shrink_lot_group_data || [];
    const materialId = row.original.id

    const shrinkLotList = materialData.shrinkage_materials.find(item => item.id === row?.original?.id)?.shrink_lot_list

    const transformedLotList = shrinkLotList.map((item: { shrink_lot_name: any; id: any; }) => ({
      label: item.shrink_lot_name,
      value: item.id
    }));

    return (
      <>
        <Box sx={{ mt: 0, ml: 0, mr: 0 }}>
          <>
            <Box sx={{ mb: 1 }}>
              <RitzRadio
                options={shrinkageTimeFrameData}
                name={'hour'}
                id={"hour"}
                isMulti={false}
                selectedValue={materialData.shrinkage_materials.find(item => item.id === row?.original?.id)?.shrinkage_test_time_frame || ''}
                isRequired={true}
                labelText={"Select Time Frame:"}
                handleOnChange={(event: any) => handleOnChangeHourSelection(event, row?.original?.id)}
                optionValue={'id'}
                optionText={'name'}
                row={1}
              />
            </Box>
            {firstSubRows && (
              <Table component={Paper} sx={{ mb: 6 }}>
                <TableRow sx={{
                  '&:nth-of-type(odd)': {
                    backgroundColor: (theme) => theme.palette.grey[200],
                  },
                  '&:last-child td, &:last-child th': {
                    borderBottom: 0
                  }
                }}>
                  <TableCell rowSpan={2} align='center' sx={{ border: '1px solid silver' }}>Batch Number</TableCell>
                  <TableCell rowSpan={2} align='center' sx={{ border: '1px solid silver' }}>Roll Number</TableCell>
                  <TableCell rowSpan={2} align='center' sx={{ border: '1px solid silver' }}>Color</TableCell>
                  {materialData.is_wash_garment ? (
                    <>

                      <TableCell colSpan={2} align='center' sx={{ border: '1px solid silver' }}>Wash Shrinkage</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell colSpan={2} align='center' sx={{ border: '1px solid silver' }}>Residual Shrinkage</TableCell>
                      <TableCell colSpan={2} align='center' sx={{ border: '1px solid silver' }}>Steam Shrinkage</TableCell>
                    </>
                  )}
                </TableRow>
                <TableRow >
                  <TableCell align='center' sx={{
                    border: '1px solid silver',
                    backgroundColor: (theme) => theme.palette.grey[200],
                    '&:last-child td, &:last-child th': {
                      borderBottom: 0
                    }
                  }}>Length</TableCell>
                  <TableCell align='center' sx={{
                    border: '1px solid silver',
                    backgroundColor: (theme) => theme.palette.grey[200],
                    '&:last-child td, &:last-child th': {
                      borderBottom: 0
                    }
                  }}>Width</TableCell>
                  {!materialData.is_wash_garment && (
                    <>

                      <TableCell align='center' sx={{
                        border: '1px solid silver',
                        backgroundColor: (theme) => theme.palette.grey[200],
                        '&:last-child td, &:last-child th': {
                          borderBottom: 0
                        }
                      }}>Length</TableCell>
                      <TableCell align='center' sx={{
                        border: '1px solid silver',
                        backgroundColor: (theme) => theme.palette.grey[200],
                        '&:last-child td, &:last-child th': {
                          borderBottom: 0
                        }
                      }}>Width</TableCell>
                    </>
                  )}

                </TableRow>
                <TableBody>
                  {firstSubRows.map((item: any, rollIndex: any) => (
                    <TableRow key={rollIndex}>
                      <TableCell align='center' sx={{ border: '1px solid silver' }}>{item.batch_number}</TableCell>
                      <TableCell align='center' sx={{ border: '1px solid silver' }}>{item.pack_number}</TableCell>
                      <TableCell align='center' sx={{ border: '1px solid silver' }}>{row?.original?.material_details?.fabric_color}</TableCell>
                      {!materialData.is_wash_garment ? (
                        <>

                          <TableCell align='center' sx={{ border: '1px solid silver' }}>
                            <RitzInput
                              name={"residual_shrinkage_length"}
                              id={"residual_shrinkage_length"}
                              selectedValue={item.residual_shrinkage_length}
                              handleOnChange={(event: any) => handleInputnOnChange(event, row.index, rollIndex)}
                              inputType='number'
                            />
                          </TableCell>
                          <TableCell align='center' sx={{ border: '1px solid silver' }}>
                            <RitzInput
                              name={"residual_shrinkage_width"}
                              id={"residual_shrinkage_width"}
                              selectedValue={item.residual_shrinkage_width}
                              handleOnChange={(event: any) => handleInputnOnChange(event, row.index, rollIndex)}
                              inputType='number'
                            />
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell align='center' sx={{ border: '1px solid silver' }}>
                            <RitzInput
                              name={"wash_shrinkage_length"}
                              id={"wash_shrinkage_length"}
                              selectedValue={item.wash_shrinkage_length}
                              handleOnChange={(event: any) => handleInputnOnChange(event, row.index, rollIndex)}
                              inputType='number'
                            />
                          </TableCell>
                          <TableCell align='center' sx={{ border: '1px solid silver' }}>
                            <RitzInput
                              name={"wash_shrinkage_width"}
                              id={"wash_shrinkage_width"}
                              selectedValue={item.wash_shrinkage_width}
                              handleOnChange={(event: any) => handleInputnOnChange(event, row.index, rollIndex)}
                              inputType='number'
                            />
                          </TableCell>
                        </>
                      )}

                      {!materialData.is_wash_garment && (
                        <>

                          <TableCell align='center' sx={{ border: '1px solid silver' }}>
                            <RitzInput
                              name={"steam_shrinkage_length"}
                              id={"steam_shrinkage_length"}
                              selectedValue={item.steam_shrinkage_length}
                              handleOnChange={(event: any) => handleInputnOnChange(event, row.index, rollIndex)}
                              inputType='number'
                            />
                          </TableCell>
                          <TableCell align='center' sx={{ border: '1px solid silver' }}>
                            <RitzInput
                              name={"steam_shrinkage_width"}
                              id={"steam_shrinkage_width"}
                              selectedValue={item.steam_shrinkage_width}
                              handleOnChange={(event: any) => handleInputnOnChange(event, row.index, rollIndex)}
                              inputType='number'
                            />
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <Typography sx={{ fontWeight: 'bold' }}>Shrinkage Lot:</Typography>

            {secondSubRows && (
              <Table sx={{ mt: 2, ml: 0, mr: 0 }}>
                <TableRow sx={{ border: '1px solid silver', backgroundColor: (theme) => theme.palette.grey[200], '&:last-child td, &:last-child th': { borderBottom: 0 } }}>
                  {materialData.is_wash_garment ? (
                    <>
                      <TableCell colSpan={2} align='center' sx={{ border: '1px solid silver' }}>Wash Shrinkage</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell colSpan={2} align='center' sx={{ border: '1px solid silver' }}>Residual Shrinkage</TableCell>
                      <TableCell colSpan={2} align='center' sx={{ border: '1px solid silver' }}>Steam Shrinkage</TableCell>
                    </>
                  )}
                  <TableCell rowSpan={2} align='center' sx={{ border: '1px solid silver' }}>Roll Numbers</TableCell>
                  <TableCell rowSpan={2} align='center' sx={{ border: '1px solid silver' }}>Shrink Lot</TableCell>
                </TableRow>
                <TableRow sx={{ border: '1px solid silver', backgroundColor: (theme) => theme.palette.grey[200], '&:last-child td, &:last-child th': { borderBottom: 0 } }}>
                  {materialData.is_wash_garment ? (
                    <>
                      <TableCell align='center' sx={{ border: '1px solid silver' }}>Length</TableCell>
                      <TableCell align='center' sx={{ border: '1px solid silver' }}>Width</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell align='center' sx={{ border: '1px solid silver' }}>Length</TableCell>
                      <TableCell align='center' sx={{ border: '1px solid silver' }}>Width</TableCell>
                      <TableCell align='center' sx={{ border: '1px solid silver' }}>Length</TableCell>
                      <TableCell align='center' sx={{ border: '1px solid silver' }}>Width</TableCell>
                    </>
                  )}

                </TableRow>
                <TableBody>
                  {secondSubRows.map((item: any, rollIndex: any) => (
                    <TableRow key={rollIndex}>

                      {materialData.is_wash_garment ? (
                        <>
                          <TableCell sx={{ border: '1px solid silver' }}>{item.wash_shrinkage_length}</TableCell>
                          <TableCell sx={{ border: '1px solid silver' }}>{item.wash_shrinkage_length}</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell align='center' sx={{ border: '1px solid silver' }}>{item.residual_shrinkage_length}</TableCell>
                          <TableCell align='center' sx={{ border: '1px solid silver' }}>{item.residual_shrinkage_width}</TableCell>
                          <TableCell align='center' sx={{ border: '1px solid silver' }}>{item.steam_shrinkage_length}</TableCell>
                          <TableCell align='center' sx={{ border: '1px solid silver' }}>{item.steam_shrinkage_width}</TableCell>

                        </>
                      )

                      }
                      <TableCell align='center' sx={{ border: '1px solid silver' }}>
                        {item.roll_numbers.map((roll: any) => roll.roll_name).join(', ')}
                      </TableCell>

                      <TableCell align='center' sx={{ border: '1px solid silver', width: '2%' }}>
                        <>
                          <CreatableSelect
                            options={transformedLotList || ''}
                            value={transformedLotList.find((opt: any) => opt.label === materialData.shrinkage_materials.find(item => item.id === row?.original?.id)?.shrink_lot_group_data[rollIndex].shrinkage_lot_name)}
                            onChange={(selectedOption) => handleChange(selectedOption, rollIndex, materialId)}
                            styles={{
                              option: (provided, state) => ({
                                ...provided,
                                backgroundColor: state.isSelected ? '#E4F1FF' : 'white',
                                color: 'black',
                                ':hover': {
                                  backgroundColor: '#F0F0F0',
                                },
                              }),
                              control: (provided) => ({
                                ...provided,
                                height: '50px',
                                width: '300px',
                              }),
                            }}
                          />
                        </>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

          </>
        </Box>
      </>
    )
  };
 
  const setColumns = () => {
    let cols: ColumnDef<any>[] = [
      {
        accessorKey: "id",
        header: "",
        cell: ({ row, getValue }) => (
          <span style={{ paddingLeft: `${row.depth * 2}rem` }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <IconButton
                size="small"
                onClick={() => handleRowExpand(row)}
                style={{ cursor: "pointer" }}
              >
                {row.getIsExpanded() ? (
                  <KeyboardArrowDownIcon />
                ) : (
                  <KeyboardArrowRightIcon />
                )}
              </IconButton>
            </Box>
          </span>
        ),
        enableSorting: false,
        enableColumnFilter: false,
        enableGlobalFilter: false,
        meta: {
          align: "left",
          width: 95,
        },
      },
      {
        accessorKey: "type",
        header: "Materials",
        cell: ({ row }) => (
          <>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {row.original.material_details.material_label}
            </Box>
          </>
        ),
      },
      {
        accessorKey: "ritz_customer_brand_reference_code",
        header: "Ritz Reference Code",
        cell: ({ row }) => (
          <>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {row.original.material_details.ritz_customer_brand_reference_code}
              <OpenInNewIcon
                  sx={{position: 'relative', top: '0px', color: 'rgb(25, 118, 210)'}}
                  onClick={() => handleReferenceCodeDetailOnClick(true, row.original.material_details.customer_brand_material_id)} />
            </Box>
          </>
        ),
      }
    ];

    setColumnDef(cols);
  };
  useEffect(() => {
    setColumns();
  }, []);

  return (
    <>
      <>
        {showDetails &&
          <CustomerBrandMaterialDetail
            customerBrandMaterialReferenceCodeId={selectedMaterialId}
            modalOpen={showDetails}
            setModalOpen={handleReferenceCodeDetailOnClick}
          />
        }
      </>
      {isModalOpen.status && <RitzModal open={isModalOpen.status} onClose={() => setIsModalOpen({ status: false, changedType: 0, materialIndex: null })} title='Confirmation'>
        <Box>
          <Grid container spacing={1} >
            <Grid item sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography> Changing time frame will delete the table data. Do you want to continue?</Typography>
            </Grid>
          </Grid>
        </Box>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'end', gap: 2 }}>
          <Button variant="contained" color='primary' onClick={handleOnClickOK}>OK</Button>
          <Button variant="contained" color='primary' onClick={handleOnClickCancel}>Cancel</Button>
        </Box>
      </RitzModal>}
      <>
        <RitzTable
          columns={columnDef}
          data={materialData.shrinkage_materials}
          getRowCanExpand={getRowCanExpand}
          renderSubComponent={renderSubRow}
        />
      </>
      <Button variant="contained" sx={{ float: 'right', marginTop: '1%', paddingLeft: '2%', paddingRight: '2%', marginRight: '1%' }} onClick={handleSave}>
        {saveClicked ? < SaveSpinner /> : <> </>}Save
      </Button>
    </>
  )
}
export default FabricShrinkage



