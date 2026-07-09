import React from 'react';
import Select from 'react-select';
import { InputLabel } from '@mui/material';


const RitzSearchableSelection = ({
  options,
  isMulti = false,
  isRequired = false,
  name,
  id,
  labelText,
  selectedValue = '',
  labelId = "label_1",
  handleOnChange,
  optionValue,
  optionText,
  isReadOnly = false
}: any) => {
  const handleChange = (selectedOption: any) => {
    handleOnChange(selectedOption?.value);
  };
  const formattedOptions = options?.map((option: any) => ({
    value: option[optionValue],
    label: option[optionText]
  }));
  const selectedOption = formattedOptions?.find((option: any) => option.value === selectedValue);
  const customStyles = {
    control: (provided: any) => ({
      ...provided,
      minHeight: '50px',
      height: '50px',
    }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }) 
  };
  return (
    <>
      {labelText && <InputLabel sx={{ mb: 1 }}>{labelText}</InputLabel>}
      <div>
        <Select
          id={id}
          name={name}
          value={selectedOption}
          options={formattedOptions}
          onChange={handleChange}
          required={isRequired}
          isMulti={isMulti}
          isDisabled={isReadOnly}
          placeholder="Search..."
          styles={customStyles}
          isClearable
          menuPortalTarget={document.body}
        />
      </div>
    </>
  );
};
export default RitzSearchableSelection;