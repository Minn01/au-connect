type CreatePostModalPropTypes = {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  initialType?: "discussion" | "media" | "article";
};

export default CreatePostModalPropTypes;
