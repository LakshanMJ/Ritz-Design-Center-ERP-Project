import RitzInput from '@/components/Ritz/RitzInput';
import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody, darken, Box, Button, IconButton, Checkbox } from '@mui/material';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { useState } from 'react';
import FormErrorMessage from '@/components/FormErrorMessage';

const MarkerPoints = ({ markerPointsData, handleChangeMarkerPoints, handleChangeDeletedIds, errors, completedMarkerStatus }: any) => {
  const [markerPoints, setMarkerPoints] = useState<any>(markerPointsData)
  const handleOtherWidthsInputChange = (event: any, markerPointIndex: any) => {
    const { name, value } = event.target;
    let updatedMarkerPoints = [...markerPoints];
    updatedMarkerPoints = markerPoints.map((point: any, index: any) => {
      if (index === markerPointIndex) {
        return {
          ...point,
          [name]: parseFloat(value) || null
        };
      }
      return point;
    });
    setMarkerPoints(updatedMarkerPoints);
    handleChangeMarkerPoints(updatedMarkerPoints);
  };

  const addNewRow = () => {
    const newRollDetail = { id: null as any, active: true, cut_point: null as any, back_point: null as any };
    const updatedPonitDetails = [...markerPoints];
    updatedPonitDetails.push(newRollDetail);
    setMarkerPoints(updatedPonitDetails);
    handleChangeMarkerPoints(updatedPonitDetails);
  };

  const deleteRow = (rollIndex: any, markerPointId: any) => {
    if (markerPointId) {
      handleChangeDeletedIds(markerPointId);
    }
    const updatedPonitDetails = [...markerPoints];
    updatedPonitDetails.splice(rollIndex, 1);
    setMarkerPoints(updatedPonitDetails);
    handleChangeMarkerPoints(updatedPonitDetails);
  };

  const handleCheckboxChange = (e: any, index: number) => {
    const isChecked = e.target.checked;
    const updatedMarkerPoints = [...markerPoints];
    updatedMarkerPoints[index].active = isChecked;
    handleChangeMarkerPoints(updatedMarkerPoints);
};

  return (
    <Box>
      <TableContainer aria-label="simple table">
        <Table sx={{ border: (theme) => theme.palette.grey[100] }}>
          <TableRow>
          <TableCell sx={{px: 2, background: (theme) => darken(theme.palette.grey[50], 0.01), textAlign: 'center'}}/>
            <TableCell sx={{px: 2, background: (theme) => darken(theme.palette.grey[50], 0.01), textAlign: 'center'}} >Back Point</TableCell>
            <TableCell sx={{px: 2, background: (theme) => darken(theme.palette.grey[50], 0.01), textAlign: 'center'}} >Cut Point</TableCell>
            <TableCell sx={{px: 2, background: (theme) => darken(theme.palette.grey[50], 0.01), textAlign: 'center'}}/>
          </TableRow>
          <TableBody>
            {markerPoints?.length > 0 ? (
              markerPoints.map((point: any, index: any) => (
                <TableRow key={index}>
                  <TableCell><Checkbox checked={point.active || false} onChange={(e) => handleCheckboxChange(e, index)}/></TableCell>
                  <TableCell sx={{ textAlign: 'left' }}>
                    <RitzInput
                      inputType={'number'}
                      name={'back_point'}
                      selectedValue={point?.back_point || ''}
                      handleOnChange={(e: any) => handleOtherWidthsInputChange(e, index)}
                      fullWidth
                      size={'small'}
                      isReadOnly={completedMarkerStatus}
                    />
                     <FormErrorMessage message={errors?.[index]?.back_point} />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'left' }}>
                    <RitzInput
                      inputType={'number'}
                      name={'cut_point'}
                      selectedValue={point?.cut_point || ''}
                      handleOnChange={(e: any) => handleOtherWidthsInputChange(e, index)}
                      fullWidth
                      size={'small'}
                      isReadOnly={completedMarkerStatus}
                    />
                    <FormErrorMessage message={errors?.[index]?.cut_point} />
                  </TableCell>
                  <TableCell style={{ textAlign: 'right' }}>
                      <IconButton onClick={() => deleteRow(index, point.id)}>
                        <DeleteForeverIcon  style={{ color: '#d32f2f'}} fontSize='inherit' />
                      </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, mr: 1, ml: 1, mb: 1 }}>
        <Button variant="outlined" size={'small'} onClick={addNewRow}>Add Point</Button>
      </Box>
    </Box>
  );
};

export default MarkerPoints;