import User from "./User";

type CreatePostModalPropTypes = {
  user: User;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  initialType?: string;
};

export default CreatePostModalPropTypes;
