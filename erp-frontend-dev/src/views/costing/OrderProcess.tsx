import { Button, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import React, { useState } from 'react'

const OrderProcess = () => {
  return (
    <>
    <Typography variant='h1'>VIEW COSTING INFO</Typography>
    <TableContainer>
  <Table component={Card}>
    <TableHead>
      <TableRow>
        <TableCell style={{width: "40%"}}>Color Ways</TableCell>
        <TableCell style={{width: "40%"}}>Country</TableCell>
        <TableCell>Action</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      <TableRow>
        
      </TableRow>
      <TableRow>
        <TableCell>Red</TableCell>
        <TableCell>Sri Lanka</TableCell>
        <TableCell><Button size='small'>Manage</Button></TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Blue</TableCell>
        <TableCell>USA</TableCell>
        <TableCell><Button size='small'>Manage</Button></TableCell>
      </TableRow>
      <TableRow>
        <TableCell>Black</TableCell>
        <TableCell>UK</TableCell>
        <TableCell><Button size='small'>Manage</Button></TableCell>
      </TableRow>
    </TableBody>
  </Table>
</TableContainer>
<Button variant='contained' color='success' style={nxtBtnStyle as any}>Next</Button>
    </>
  )
}

export default OrderProcess

const nxtBtnStyle = {
  marginTop:"5%",
  paddingLeft: "25px",
  paddingRight: "25px",
  float: "right",
  marginRight: "0"}

  const h1Style = {
    fontSize: "20px",
    fontWeight: "bold",
    textAlign: "center",
    marginTop: "10px",
    marginBottom: "10px"}