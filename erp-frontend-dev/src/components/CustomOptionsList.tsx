import { Box } from '@mui/material';

const CustomOptionsList = ({ innerRef, innerProps, data, isFocused }: any) => (
    <Box
        ref={innerRef}
        {...innerProps}
        sx={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px',
            backgroundColor: isFocused ? '#F0F0F0' : 'white',
            ':hover': {
                backgroundColor: '#F0F0F0',
            },
        }}
    >
        {data.image && (
            <img
                src={data.image}
                alt={data.label}
                style={{
                    width: 30,
                    height: 30,
                    marginRight: 10,
                    objectFit: 'cover',
                    borderRadius: '50%',
                }}
            />
        )}
        <Box>{data.label}</Box>
    </Box>
)

export default CustomOptionsList;