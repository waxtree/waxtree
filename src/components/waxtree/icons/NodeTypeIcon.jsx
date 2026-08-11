import { ListMusic } from 'lucide-react';
import { ArtistIcon } from '@/components/waxtree/icons/ArtistIcon';
import { LabelIcon } from '@/components/waxtree/icons/LabelIcon';

export const NodeTypeIcon = ({ type, className }) => {
  if (type === 'label') return <LabelIcon className={className} />;
  if (type === 'discogs_list') return <ListMusic className={className} />;
  return <ArtistIcon className={className} />;
};
