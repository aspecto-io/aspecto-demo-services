import React from 'react';

export interface User {
    token?: string;
}

export const UserContext = React.createContext<User>({});

export default UserContext;