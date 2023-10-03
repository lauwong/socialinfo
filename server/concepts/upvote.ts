import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface UpvoteDoc extends BaseDoc {
  user: ObjectId;
  target: ObjectId;
}

export default class UpvoteConcept {
  public readonly upvotes = new DocCollection<UpvoteDoc>("upvotes");
  
  async cast(user: ObjectId, target: ObjectId) {
    this.canCastVote(user, target);
    const _id = await this.upvotes.createOne({ user, target });
    return { msg: "Successfully upvoted!", context: await this.upvotes.readOne({ _id }) };
  }

  async retract(_id: ObjectId) {
    await this.upvotes.deleteOne({ _id });
    return { msg: "Upvote removed successfully!" };
  }

  async countVotes(target: ObjectId) {
    const votes = await this.upvotes.readMany({ target });
    return { msg: "Upvotes successfully tallied!", count: votes.length };
  }

  async getMostUpvoted(items: ObjectId[]) {

    let maxId;
    let max = -1;

    for (const item of items) {
      const count = (await this.upvotes.readMany({ item })).length;
      if (count > max) {
        max = count;
        maxId = item;
      }
    }

    if (maxId) {
      return { msg: "Calculated most upvoted!", item: maxId, count: max };
    } else {
      throw new NotFoundError(`No contexts yet!`);
    }
    
  }

  private async canCastVote(user: ObjectId, target: ObjectId) {
    if (await this.upvotes.readOne({ user, target })) {
      throw new NotAllowedError(`User ${user} with has already upvoted item ${target}!`);
    }
  }

  async isVoter(user: ObjectId, _id: ObjectId) {
    const upvote = await this.upvotes.readOne({ _id });
    if (!upvote) {
      throw new NotFoundError(`Vote ${_id} does not exist!`);
    }
    if (upvote.user.toString() !== user.toString()) {
      throw new VoterNotMatchError(user, _id);
    }
  }
}

export class VoterNotMatchError extends NotAllowedError {
  constructor(
    public readonly user: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the originator of {1}!", user, _id);
  }
}