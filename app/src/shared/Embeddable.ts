import { Allow, Entity, Fields, Relations } from "remult";

import { Project } from "./Project";
import { User } from "./Auth";

export interface Embeddable {
  id: string;
  content: string;
  owner?: User;
  project?: Project;
}

@Entity("uploads", {
  allowApiCrud: Allow.authenticated,
})
export class Upload implements Embeddable {
  @Fields.id()
  id = "";

  @Fields.string()
  content = "";

  @Fields.integer()
  size = 0;

  @Fields.string()
  mime = "";

  @Fields.string()
  url = "";

  @Relations.toOne(() => Project)
  project?: Project;
}

@Entity("queries", {
  allowApiCrud: Allow.authenticated,
})
export class Query implements Embeddable {
  @Fields.id()
  id = "";

  @Fields.string()
  content = "";

  @Relations.toOne(() => Project)
  project?: Project;
}
